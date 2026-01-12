// ignore_for_file: avoid_void_async

import 'package:flutter/material.dart';
import 'package:flutterboilerplate/pages/app_routes.dart';
import 'package:flutterboilerplate/pages/debug_baner.dart';
import 'package:flutterboilerplate/pages/otp/otp_input_dialog.dart';
import 'package:flutterboilerplate/session/session_provider.dart';
import 'package:flutterboilerplate/singletonGods/logger.dart';
import 'package:flutterboilerplate/theme/theme.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import 'models/models.dart';
import 'table_repository.dart';
import 'table_verification_page.dart';

// Define the possible states for table verification
enum TableVerificationState {
  loading,
  success,
  otpRequired,
  error,
}

class TableVerificationPageState extends State<TableVerificationPage> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _phoneController = TextEditingController();
  final _tableRepository = TableRepository();
  bool _isLoading = false;

  // Replace the boolean flags with a single state enum
  TableVerificationState _state = TableVerificationState.loading;
  String? _error;

  @override
  void initState() {
    super.initState();
    _validateTable();
  }

  @override
  void dispose() {
    _nameController.dispose();
    _phoneController.dispose();
    super.dispose();
  }

  /// Validates the table using the table repository
  Future<void> _validateTable() async {
    setState(() {
      _error = null;
      _state = TableVerificationState.loading;
    });

    try {
      final sessionId = context.read<SessionProvider>().sessionId;
      if (sessionId != null) {
        AppLogger.log('🔑 VERIFY: Found existing sessionId: $sessionId');
        AppLogger.log(
          '🔑 VERIFY: Using persisted session for table validation',
        );
      } else {
        AppLogger.log(
          '🔑 VERIFY: No existing sessionId found - will require fresh OTP validation',
        );
      }

      AppLogger.log(
        '🔑 VERIFY: Restaurant: ${widget.restaurantId}, Table: ${widget.tableId}',
      );

      final response = await _tableRepository.validateTableAndLocation(
        restaurantId: widget.restaurantId!,
        tableId: widget.tableId!,
        userLocation: const UserLocation(latitude: 0, longitude: 0),
        sessionId: sessionId,
      );

      if (!response.success) {
        final rawDetails = response.errorDetails;
        AppLogger.log(
          '🔑 VERIFY: Error Response - Code: ${response.errorCode}, Details: $rawDetails',
        );

        // Handle OTP required case (401 Unauthorized)
        if ((response.errorCode?.toLowerCase() == 'unauthenticated' ||
                response.errorCode == 'TABLE_UNAUTHORIZED') &&
            rawDetails != null) {
          AppLogger.log(
            '🔑 Received 401/unauthenticated response with OTP required',
          );
          AppLogger.log('🔑 Raw Details: $rawDetails');

          // Extract required fields from raw details with defaults
          final authMsg = rawDetails['authMessage'] as String? ??
              rawDetails['error'] as String? ??
              'OTP Required';
          final requireName =
              rawDetails['isUsernameMandatory'] as bool? ?? false;
          final requirePhone =
              rawDetails['isPhoneNumberMandatory'] as bool? ?? false;
          final isMultiUser =
              rawDetails['isMultiUserSupported'] as bool? ?? false;
          final tableStatus = rawDetails['tableStatus'] as String?;

          // Extract server and primary customer info for enhanced message
          final serverName = rawDetails['assignedServer']?['name'] as String?;
          final primaryCustomerName =
              rawDetails['primaryCustomer']?['name'] as String?;

          // Create enhanced auth message if server or primary customer info is available
          var enhancedAuthMsg = authMsg;
          if (primaryCustomerName != null || serverName != null) {
            enhancedAuthMsg =
                'Please ask ${primaryCustomerName ?? 'the primary customer'} '
                'or ${serverName ?? 'your server'} for the OTP code.';
          }

          _handleOtpRequiredWithRawDetails(
            authMessage: enhancedAuthMsg,
            requireName: requireName,
            requirePhone: requirePhone,
            isMultiUserSupported: isMultiUser,
            tableStatus: tableStatus,
            rawDetails: rawDetails,
          );
          return;
        }

        // Handle location verification failed (412 Precondition Failed)
        if (response.errorCode == 'TABLE_LOCATION_MISMATCH') {
          _handleValidationError(
            '${response.message}. Please make sure you are physically at the restaurant.',
          );
          return;
        }

        // Handle table disabled error (403 Forbidden)
        if (response.errorCode == 'TABLE_DISABLED') {
          _handleValidationError(
            'This table is currently unavailable. Please contact restaurant staff.',
          );
          return;
        }

        // For any other error, use the general error handler
        _handleValidationError(response.message);
        return;
      }

      final tableStatus = response.data;

      if (tableStatus == null) {
        _handleValidationError('Invalid table status received');
        return;
      }

      if (tableStatus.status == 'error') {
        _handleValidationError(tableStatus.message);
        return;
      }

      if (tableStatus.requiresOtp) {
        _handleOtpRequiredWithRawDetails(
          authMessage: tableStatus.authMessage ?? 'OTP Required',
          requireName: tableStatus.isUsernameMandatory,
          requirePhone: tableStatus.isPhoneNumberMandatory,
          isMultiUserSupported: tableStatus.isMultiUserSupported,
          tableStatus: tableStatus.tableStatus,
          rawDetails: tableStatus.data ?? {},
        );
        return;
      }

      if (tableStatus.status == 'success') {
        _handleValidationSuccess(tableStatus);
      } else {
        _handleValidationError(
          'Unexpected table status: ${tableStatus.status}',
        );
      }
    } catch (e) {
      _handleValidationError(e.toString());
    }
  }

  /// Helper method to retry table validation
  void _retryValidation() {
    setState(() {
      _error = null;
      _state = TableVerificationState.loading;
    });
    _validateTable();
  }

  /// Handles OTP required scenario with raw error details
  void _handleOtpRequiredWithRawDetails({
    required String authMessage,
    required bool requireName,
    required bool requirePhone,
    required bool isMultiUserSupported,
    required Map<String, dynamic> rawDetails,
    String? tableStatus,
  }) {
    AppLogger.log('🔑 VERIFY: OTP Required - $authMessage');
    AppLogger.log(
      '🔑 OTP Settings - Username Required: $requireName, Phone Required: $requirePhone',
    );
    AppLogger.log(
      '🔑 Table Status: $tableStatus, Multi-User Support: $isMultiUserSupported',
    );

    setState(() {
      _error = authMessage;
      _state = TableVerificationState.otpRequired;
    });

    if (mounted) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        showDialog<void>(
          context: context,
          barrierDismissible: false,
          builder: (BuildContext dialogContext) {
            return OtpInputDialog(
              handleOtpApi: true,
              message: authMessage,
              requireName: requireName,
              requirePhoneNumber: requirePhone,
              restaurantId: widget.restaurantId,
              tableId: widget.tableId,
              onOtpSuccess: (responseData) {
                AppLogger.log('✅ OTP Validated: ${responseData.status}');

                context.read<SessionProvider>().updateFromTableValidation(
                      TableValidationResponse(
                        status: responseData.status,
                        message: '',
                        data: {
                          'session': {'sessionId': responseData.sessionId},
                        },
                      ),
                    );

                if (mounted) {
                  _navigateAfterSuccess();
                }
              },
              onOtpFailed: (error, errorCode) {
                AppLogger.log('❌ OTP Failed: $error (Code: $errorCode)');

                // Handle ask_primary_customer case
                if (errorCode == 'TABLE_UNAUTHORIZED' &&
                    rawDetails['status'] == 'ask_primary_customer') {
                  final primaryCustomerName =
                      rawDetails['primaryCustomer']?['name'] as String?;
                  final primaryCustomerPhone =
                      rawDetails['primaryCustomer']?['phoneNumber'] as String?;

                  final message =
                      'Please ask the primary customer ($primaryCustomerName) to verify this table.';
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text(message),
                      duration: const Duration(seconds: 5),
                    ),
                  );
                } else {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text(error)),
                  );
                }
              },
              onCancel: () {
                AppLogger.log('OTP Dialog cancelled by user.');
                _retryValidation();
              },
            );
          },
        );
      });
    }
  }

  void _handleValidationSuccess(TableValidationResponse tableStatus) {
    AppLogger.log('✅ VERIFY: Success - sessionId: ${tableStatus.sessionId}');

    // Update session in the provider if sessionId is available
    if (tableStatus.sessionId != null) {
      context.read<SessionProvider>().updateFromTableValidation(tableStatus);

      setState(() => _state = TableVerificationState.success);

      // Navigate if needed
      if (mounted) {
        _navigateAfterSuccess();
      }
    } else {
      _handleValidationError('Session ID missing in successful response');
    }
  }

  void _handleValidationError(String message) {
    AppLogger.log('❌ VERIFY: Error - $message');
    setState(() {
      _error = message;
      _state = TableVerificationState.error;
    });
  }

  /// Navigates to the appropriate screen after successful validation,
  /// replacing the current route in the stack.
  void _navigateAfterSuccess() {
    if (widget.onLoginSuccess != null) {
      // If a custom callback is provided, it's responsible for navigation.
      // Ensure the callback implementation also handles stack replacement if needed.
      AppLogger.log('NAV: Executing onLoginSuccess callback.');
      widget.onLoginSuccess!();
    } else {
      // Use context.go to navigate to the menu screen.
      // context.go replaces the current navigation stack with the new route,
      // effectively removing the TableVerificationPage from the back stack.
      AppLogger.log(
        'NAV: Navigating to Menu screen using context.go, replacing current route.',
      );
      context.go(AppRoutes.menu(widget.restaurantId!, widget.tableId!));
    }
  }

  void _handleSubmit() async {
    if (_formKey.currentState?.validate() ?? false) {
      setState(() => _isLoading = true);

      try {
        final success = await context.read<SessionProvider>().authenticate(
              name: _nameController.text,
              phone: _phoneController.text,
              tableId: widget.tableId!,
              restaurantId: widget.restaurantId!,
            );

        if (success && mounted) {
          if (widget.onLoginSuccess != null) {
            widget.onLoginSuccess!();
          } else {
            context.go(AppRoutes.menu(widget.restaurantId!, widget.tableId!));
          }
        }
      } catch (e) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Verification failed: $e')),
        );
      } finally {
        if (mounted) setState(() => _isLoading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    AppLogger.log('🔐 VERIFY: Rendering table verification page');
    AppLogger.log(
      '📝 PARAMS: restaurantId=${widget.restaurantId}, tableId=${widget.tableId}',
    );

    // Use the state enum to determine what to render
    switch (_state) {
      case TableVerificationState.loading:
        return _buildLoadingView();
      case TableVerificationState.error:
        return _buildErrorView();
      case TableVerificationState.otpRequired:
        return _buildOtpRequiredView();
      case TableVerificationState.success:
        return _buildVerificationForm();
    }
  }

  /// Builds the loading view with a centered progress indicator
  Widget _buildLoadingView() {
    return const Scaffold(
      body: Center(child: CircularProgressIndicator()),
    );
  }

  /// Builds the error view with error message and retry button
  Widget _buildErrorView() {
    return Scaffold(
      body: Center(
        child: Padding(
          padding: AppSpacing.pagePadding,
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(
                'Error',
                style: Theme.of(context).textTheme.headlineSmall,
              ),
              AppSpacing.verticalSM,
              Text(_error!, textAlign: TextAlign.center),
              AppSpacing.verticalLG,
              ElevatedButton(
                onPressed: _retryValidation,
                child: const Text('Retry'),
              ),
            ],
          ),
        ),
      ),
    );
  }

  /// Builds the OTP required view with guidance message
  Widget _buildOtpRequiredView() {
    return Scaffold(
      body: Center(
        child: Padding(
          padding: AppSpacing.pagePadding,
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(
                'OTP Required',
                style: Theme.of(context).textTheme.headlineSmall,
              ),
              AppSpacing.verticalSM,
              Text(_error!, textAlign: TextAlign.center),
              AppSpacing.verticalLG,
              ElevatedButton(
                onPressed: _retryValidation,
                child: const Text('Retry'),
              ),
            ],
          ),
        ),
      ),
    );
  }

  /// Builds the verification form for user details
  Widget _buildVerificationForm() {
    return Scaffold(
      appBar: AppBar(title: const Text('Table Verification')),
      body: Column(
        children: [
          DebugBanner(
            tableId: widget.tableId ?? 'null',
            restaurantId: widget.restaurantId ?? 'null',
          ),
          Expanded(
            child: Padding(
              padding: AppSpacing.pagePadding,
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Text(
                      'Please verify your table',
                      style: Theme.of(context).textTheme.titleLarge,
                    ),
                    AppSpacing.verticalXL,
                    _buildNameField(),
                    AppSpacing.verticalLG,
                    _buildPhoneField(),
                    AppSpacing.verticalXL,
                    _buildSubmitButton(),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  /// Builds the name input field
  Widget _buildNameField() {
    return TextFormField(
      controller: _nameController,
      decoration: const InputDecoration(
        labelText: 'Name',
        border: OutlineInputBorder(),
      ),
      validator: (value) {
        if (value == null || value.isEmpty) {
          return 'Please enter your name';
        }
        return null;
      },
    );
  }

  /// Builds the phone number input field
  Widget _buildPhoneField() {
    return TextFormField(
      controller: _phoneController,
      decoration: const InputDecoration(
        labelText: 'Phone Number',
        border: OutlineInputBorder(),
      ),
      keyboardType: TextInputType.phone,
      validator: (value) {
        if (value == null || value.isEmpty) {
          return 'Please enter your phone number';
        }
        if (value.length != 10 || !RegExp(r'^[0-9]+$').hasMatch(value)) {
          return 'Please enter a valid 10-digit phone number';
        }
        return null;
      },
    );
  }

  /// Builds the submit button with loading state
  Widget _buildSubmitButton() {
    return ElevatedButton(
      onPressed: _isLoading ? null : _handleSubmit,
      child: _isLoading
          ? const SizedBox(
              height: 20,
              width: 20,
              child: CircularProgressIndicator(strokeWidth: 2),
            )
          : const Text('Continue'),
    );
  }
}

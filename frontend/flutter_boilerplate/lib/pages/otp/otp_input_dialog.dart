import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutterboilerplate/models/api_response.dart'; // Import ApiResponse
import 'package:flutterboilerplate/singletonGods/logger.dart';

import 'models/otp_models.dart'; // Import OTP models
import 'otp_details.dart';
import 'otp_repository.dart'; // Import OTP repository

/// A generic dialog widget for collecting OTP and optionally other user details.
///
/// Can either handle the API call internally using [OtpRepository] or provide
/// the collected data back via a callback.
class OtpInputDialog extends StatefulWidget {
  /// Optional message to display above the input fields.
  final String? message;
  /// The number of digits expected for the OTP. Defaults to 6.
  final int otpDigits;
  /// If true, the dialog uses [OtpRepository] to validate the OTP.
  /// Requires `restaurantId` and `tableId` to be provided.
  /// Expects `onOtpSuccess` and `onOtpFailed`. Defaults to false.
  final bool handleOtpApi;
  /// If true, displays an input field for the user's name. Defaults to false.
  final bool requireName;
  /// If true, displays an input field for the user's phone number. Defaults to false.
  final bool requirePhoneNumber;

  // --- Parameters required only when handleOtpApi is true ---
  /// The ID of the restaurant, required if `handleOtpApi` is true.
  final String? restaurantId;
  /// The ID of the table, required if `handleOtpApi` is true.
  final String? tableId;
  /// Callback invoked when `handleOtpApi` is true and OTP validation succeeds.
  /// Passes the successful [OtpValidationResponse] data.
  final void Function(OtpValidationResponse responseData)? onOtpSuccess;
  /// Callback invoked when `handleOtpApi` is true and OTP validation fails.
  /// Passes the error message and optional error code.
  final void Function(String error, String? errorCode)? onOtpFailed;
  // --- End handleOtpApi parameters ---


  /// Callback function triggered when the user submits the form and `handleOtpApi` is false.
  /// Passes an [OtpDetails] object containing the entered information.
  final void Function(OtpDetails details)? onOtpSubmitted;


  /// Callback function triggered when the user cancels the dialog.
  final VoidCallback? onCancel;

  const OtpInputDialog({
    super.key,
    this.message,
    this.otpDigits = 6,
    this.handleOtpApi = false,
    this.requireName = false,
    this.requirePhoneNumber = false,
    // Parameters for handleOtpApi = true
    this.restaurantId,
    this.tableId,
    this.onOtpSuccess,
    this.onOtpFailed,
    // Parameters for handleOtpApi = false
    this.onOtpSubmitted,
    // General
    this.onCancel,
  }) : assert(
          handleOtpApi
              ? (restaurantId != null && tableId != null && onOtpSuccess != null && onOtpFailed != null && onOtpSubmitted == null)
              : (onOtpSubmitted != null && restaurantId == null && tableId == null && onOtpSuccess == null && onOtpFailed == null),
          'When `handleOtpApi` is true, `restaurantId`, `tableId`, `onOtpSuccess`, and `onOtpFailed` must be provided. '
          'When `handleOtpApi` is false, `onOtpSubmitted` must be provided and others must be null.',
        );


  @override
  State<OtpInputDialog> createState() => _OtpInputDialogState();
}

class _OtpInputDialogState extends State<OtpInputDialog> {
  final _formKey = GlobalKey<FormState>();
  final _otpController = TextEditingController();
  final _nameController = TextEditingController();
  final _phoneController = TextEditingController();
  bool _isLoading = false;

  // Instantiate the repository if needed
  late final OtpRepository _otpRepository;

  @override
  void initState() {
    super.initState();
    if (widget.handleOtpApi) {
      _otpRepository = OtpRepository();
    }
  }


  @override
  void dispose() {
    _otpController.dispose();
    _nameController.dispose();
    _phoneController.dispose();
    super.dispose();
  }

  Future<void> _handleSubmit() async {
    if (!(_formKey.currentState?.validate() ?? false)) {
      return; // Validation failed
    }

    setState(() => _isLoading = true);

    final otpDetails = OtpDetails(
      otp: _otpController.text,
      name: widget.requireName ? _nameController.text : null,
      phoneNumber: widget.requirePhoneNumber ? _phoneController.text : null,
    );

    AppLogger.log('OTP Dialog: Submitting details: $otpDetails');

    if (widget.handleOtpApi) {
      // Handle API call internally using OtpRepository
      final request = OtpValidationRequest(
        restaurantId: widget.restaurantId!, // Assert non-null due to constructor assert
        tableId: widget.tableId!,       // Assert non-null due to constructor assert
        otp: otpDetails.otp,
        name: otpDetails.name,
        phoneNumber: otpDetails.phoneNumber,
      );

      try {
        AppLogger.log('OTP Dialog: Calling OtpRepository.validateOtp...');
        final ApiResponse<OtpValidationResponse> response =
            await _otpRepository.validateOtp(request);

        if (response.success && response.data != null) {
          AppLogger.log('OTP Dialog: Repository call successful.');
          widget.onOtpSuccess!(response.data!); // Pass response data
          if (mounted && Navigator.canPop(context)) {
            Navigator.pop(context); // Close dialog on success
          }
        } else {
           AppLogger.log('OTP Dialog: Repository call failed. Error: ${response.message}, Code: ${response.errorCode}');
           widget.onOtpFailed!(response.message, response.errorCode);
           // Keep dialog open for user to correct details
        }
      } catch (e) {
         // Catch potential exceptions from the repository call itself if not handled within ApiResponse
         AppLogger.log('OTP Dialog: Exception during repository call: $e');
         widget.onOtpFailed!(e.toString(), null); // Pass generic error
         // Keep dialog open
      } finally {
         if (mounted) setState(() => _isLoading = false);
      }
    } else {
      // Pass details back via callback
      AppLogger.log('OTP Dialog: Calling onOtpSubmitted callback.');
      widget.onOtpSubmitted!(otpDetails);
       if (mounted && Navigator.canPop(context)) {
            Navigator.pop(context); // Close dialog after submitting
       }
       // Set loading false only if dialog wasn't closed or if still mounted
       if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Enter Verification Details'),
      content: Form(
        key: _formKey,
        child: SingleChildScrollView( // Ensure content scrolls if too tall
             child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (widget.message != null) ...[
                  Text(widget.message!),
                  const SizedBox(height: 16),
                ],

                // --- Optional Name Field ---
                if (widget.requireName) ...[
                  TextFormField(
                    controller: _nameController,
                    decoration: const InputDecoration(
                      labelText: 'Name',
                      border: OutlineInputBorder(),
                    ),
                    validator: (value) {
                      if (widget.requireName && (value == null || value.isEmpty)) {
                        return 'Please enter your name';
                      }
                      return null;
                    },
                    textInputAction: TextInputAction.next, // Improve keyboard navigation
                  ),
                  const SizedBox(height: 16),
                ],

                // --- Optional Phone Field ---
                 if (widget.requirePhoneNumber) ...[
                  TextFormField(
                    controller: _phoneController,
                    keyboardType: TextInputType.phone,
                     inputFormatters: [
                         FilteringTextInputFormatter.digitsOnly,
                         // Add specific length validation if needed, e.g., LengthLimitingTextInputFormatter(10)
                     ],
                    decoration: const InputDecoration(
                      labelText: 'Phone Number',
                      border: OutlineInputBorder(),
                    ),
                    validator: (value) {
                      if (widget.requirePhoneNumber && (value == null || value.isEmpty)) {
                        return 'Please enter your phone number';
                      }
                      // Add more specific phone validation if needed (e.g., length, format)
                      return null;
                    },
                    textInputAction: widget.requireName ? TextInputAction.next : TextInputAction.done, // Adjust based on fields
                  ),
                  const SizedBox(height: 16),
                 ],

                // --- OTP Field (Mandatory) ---
                TextFormField(
                  controller: _otpController,
                  autofocus: !widget.requireName && !widget.requirePhoneNumber, // Autofocus if it's the first field
                  keyboardType: TextInputType.number,
                  inputFormatters: [
                    FilteringTextInputFormatter.digitsOnly,
                    LengthLimitingTextInputFormatter(widget.otpDigits),
                  ],
                  decoration: InputDecoration(
                    labelText: 'OTP Code',
                    hintText: 'Enter ${widget.otpDigits}-digit code',
                    border: const OutlineInputBorder(),
                    counterText: "", // Hide the default counter
                  ),
                  validator: (value) {
                    if (value == null || value.isEmpty) {
                      return 'Please enter the OTP';
                    }
                    if (value.length != widget.otpDigits) {
                      return 'Please enter a valid ${widget.otpDigits}-digit OTP';
                    }
                    return null;
                  },
                  maxLength: widget.otpDigits,
                  textInputAction: TextInputAction.done, // Last field
                  onFieldSubmitted: (_) => _isLoading ? null : _handleSubmit(), // Allow submit via keyboard
                ),
              ],
             ),
        ),
      ),
      actions: [
        TextButton(
          onPressed: _isLoading ? null : () {
             if (widget.onCancel != null) {
                widget.onCancel!();
             }
             // Always try to pop after cancel callback
             if (mounted && Navigator.canPop(context)) {
                Navigator.pop(context);
             }
          },
          child: const Text('Cancel'),
        ),
        ElevatedButton(
          onPressed: _isLoading ? null : _handleSubmit,
          child: _isLoading
              ? const SizedBox(
                  height: 20,
                  width: 20,
                  child: CircularProgressIndicator(strokeWidth: 2),
                )
              : const Text('Submit'),
        ),
      ],
    );
  }
} 
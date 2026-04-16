import 'package:dio/dio.dart';

export 'api_constants.dart';
export 'kitchen_order_api_service.dart';

/// Thin Dio holder retained for any legacy references. New code should
/// construct `KitchenOrderApiService` directly (it picks up the singleton
/// `DioClient` from `platter_core` by default).
class NetworkService {
  NetworkService(this.dio);

  final Dio dio;
}

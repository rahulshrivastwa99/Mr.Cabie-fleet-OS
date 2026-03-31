class Trip {
  final String id;
  final String clientId;
  final String? clientName;
  final String? vehicleId;
  final String? driverId;
  final String status;
  final String tripType;
  final String pickupLocation;
  final String dropoffLocation;
  final DateTime pickupTime;
  final DateTime? endTime;
  final String passengerName;
  final String passengerPhone;
  final String? notes;
  final String? dutySlipId;
  final Map<String, dynamic>? vehicle;
  final DutySlip? dutySlip;

  Trip({
    required this.id,
    required this.clientId,
    this.clientName,
    this.vehicleId,
    this.driverId,
    required this.status,
    required this.tripType,
    required this.pickupLocation,
    required this.dropoffLocation,
    required this.pickupTime,
    this.endTime,
    required this.passengerName,
    required this.passengerPhone,
    this.notes,
    this.dutySlipId,
    this.vehicle,
    this.dutySlip,
  });

  factory Trip.fromJson(Map<String, dynamic> json) {
    return Trip(
      id: json['id'] ?? '',
      clientId: json['client_id'] ?? '',
      clientName: json['client_name'],
      vehicleId: json['vehicle_id'],
      driverId: json['driver_id'],
      status: json['status'] ?? 'CREATED',
      tripType: json['trip_type'] ?? 'ONE_WAY',
      pickupLocation: json['pickup_location'] ?? '',
      dropoffLocation: json['dropoff_location'] ?? '',
      pickupTime: DateTime.parse(json['pickup_time']),
      endTime: json['end_time'] != null ? DateTime.parse(json['end_time']) : null,
      passengerName: json['passenger_name'] ?? '',
      passengerPhone: json['passenger_phone'] ?? '',
      notes: json['notes'],
      dutySlipId: json['duty_slip_id'],
      vehicle: json['vehicle'],
      dutySlip: json['duty_slip'] != null ? DutySlip.fromJson(json['duty_slip']) : null,
    );
  }

  bool get isAssigned => status == 'ASSIGNED';
  bool get isAccepted => status == 'ACCEPTED';
  bool get isStarted => status == 'STARTED';
  bool get isCompleted => status == 'COMPLETED';
  
  bool get canAccept => status == 'ASSIGNED';
  bool get canStart => status == 'ACCEPTED';
  bool get canComplete => status == 'STARTED';

  String get statusDisplay {
    switch (status) {
      case 'ASSIGNED':
        return 'New Assignment';
      case 'ACCEPTED':
        return 'Ready to Start';
      case 'STARTED':
        return 'In Progress';
      case 'COMPLETED':
        return 'Completed';
      default:
        return status;
    }
  }

  String get vehicleInfo {
    if (vehicle == null) return 'Not assigned';
    return '${vehicle!['registration_number']} - ${vehicle!['vehicle_type']}';
  }
}

class DutySlip {
  final String id;
  final String tripId;
  final String? driverId;
  final String? vehicleId;
  final double? openingKm;
  final double? closingKm;
  final double? totalKm;
  final String status;
  final String? startTime;
  final String? endTime;
  final String? driverRemarks;
  final String? passengerSignature;

  DutySlip({
    required this.id,
    required this.tripId,
    this.driverId,
    this.vehicleId,
    this.openingKm,
    this.closingKm,
    this.totalKm,
    required this.status,
    this.startTime,
    this.endTime,
    this.driverRemarks,
    this.passengerSignature,
  });

  factory DutySlip.fromJson(Map<String, dynamic> json) {
    return DutySlip(
      id: json['id'] ?? '',
      tripId: json['trip_id'] ?? '',
      driverId: json['driver_id'],
      vehicleId: json['vehicle_id'],
      openingKm: json['opening_km']?.toDouble(),
      closingKm: json['closing_km']?.toDouble(),
      totalKm: json['total_km']?.toDouble(),
      status: json['status'] ?? 'DRAFT',
      startTime: json['start_time'],
      endTime: json['end_time'],
      driverRemarks: json['driver_remarks'],
      passengerSignature: json['passenger_signature'],
    );
  }
}

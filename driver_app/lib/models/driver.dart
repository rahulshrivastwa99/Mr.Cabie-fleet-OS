class Driver {
  final String id;
  final String name;
  final String phone;
  final String? email;
  final String status;
  final String? licenseNumber;
  final Map<String, dynamic>? currentLocation;

  Driver({
    required this.id,
    required this.name,
    required this.phone,
    this.email,
    required this.status,
    this.licenseNumber,
    this.currentLocation,
  });

  factory Driver.fromJson(Map<String, dynamic> json) {
    return Driver(
      id: json['id'] ?? '',
      name: json['name'] ?? '',
      phone: json['phone'] ?? '',
      email: json['email'],
      status: json['status'] ?? 'AVAILABLE',
      licenseNumber: json['license_number'],
      currentLocation: json['current_location'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'phone': phone,
      'email': email,
      'status': status,
      'license_number': licenseNumber,
      'current_location': currentLocation,
    };
  }
}

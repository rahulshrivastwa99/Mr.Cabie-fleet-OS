import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Plus, Pencil, Truck } from '@phosphor-icons/react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const API_BASE = `${process.env.REACT_APP_BACKEND_URL}/api`;

const FleetManagement = () => {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [formData, setFormData] = useState({
    registration_number: '',
    vehicle_type: 'SEDAN',
    model: '',
    manufacturer: '',
    year: new Date().getFullYear(),
    capacity: 4
  });

  useEffect(() => {
    fetchVehicles();
  }, []);

  const fetchVehicles = async () => {
    try {
      const response = await axios.get(`${API_BASE}/vehicles`);
      setVehicles(response.data);
    } catch (error) {
      toast.error('Failed to load vehicles');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingVehicle) {
        await axios.put(`${API_BASE}/vehicles/${editingVehicle.id}`, formData);
        toast.success('Vehicle updated successfully');
      } else {
        await axios.post(`${API_BASE}/vehicles`, formData);
        toast.success('Vehicle added successfully');
      }
      setShowModal(false);
      resetForm();
      fetchVehicles();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Operation failed');
    }
  };

  const resetForm = () => {
    setFormData({
      registration_number: '',
      vehicle_type: 'SEDAN',
      model: '',
      manufacturer: '',
      year: new Date().getFullYear(),
      capacity: 4
    });
    setEditingVehicle(null);
  };

  const handleEdit = (vehicle) => {
    setEditingVehicle(vehicle);
    setFormData({
      registration_number: vehicle.registration_number,
      vehicle_type: vehicle.vehicle_type,
      model: vehicle.model,
      manufacturer: vehicle.manufacturer,
      year: vehicle.year,
      capacity: vehicle.capacity
    });
    setShowModal(true);
  };

  const getStatusBadgeClass = (status) => {
    const classes = {
      AVAILABLE: 'status-started',
      ON_DUTY: 'status-accepted',
      MAINTENANCE: 'status-billed',
      INACTIVE: 'status-created'
    };
    return `status-badge ${classes[status] || 'status-created'}`;
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#0047FF] border-t-transparent rounded-sm animate-spin mx-auto mb-4"></div>
          <p className="text-sm text-[#525252]">Loading fleet...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6" data-testid="fleet-page">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight" data-testid="fleet-title">Fleet Management</h1>
          <p className="text-xs text-[#525252] uppercase tracking-widest mt-2">Vehicle Operations</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="flex items-center gap-2 bg-[#0047FF] text-white px-6 py-3 font-semibold text-sm hover:bg-[#003BCC] transition-colors duration-150"
          data-testid="add-vehicle-button"
        >
          <Plus size={20} weight="bold" />
          Add Vehicle
        </button>
      </div>

      <div className="bg-white border border-[#E5E5E5]">
        <table className="w-full">
          <thead className="bg-[#FAFAFA] border-b border-[#E5E5E5]">
            <tr>
              <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-widest text-[#525252]">Registration</th>
              <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-widest text-[#525252]">Type</th>
              <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-widest text-[#525252]">Model</th>
              <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-widest text-[#525252]">Manufacturer</th>
              <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-widest text-[#525252]">Year</th>
              <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-widest text-[#525252]">Status</th>
              <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-widest text-[#525252]">Actions</th>
            </tr>
          </thead>
          <tbody>
            {vehicles.length === 0 ? (
              <tr>
                <td colSpan="7" className="text-center py-12">
                  <Truck size={48} className="mx-auto mb-4 text-[#E5E5E5]" />
                  <p className="text-sm text-[#525252]">No vehicles found. Add your first vehicle.</p>
                </td>
              </tr>
            ) : (
              vehicles.map((vehicle) => (
                <tr key={vehicle.id} className="border-b border-[#E5E5E5] hover:bg-[#FAFAFA] transition-colors duration-150">
                  <td className="px-6 py-4 text-sm font-semibold">{vehicle.registration_number}</td>
                  <td className="px-6 py-4 text-sm">{vehicle.vehicle_type}</td>
                  <td className="px-6 py-4 text-sm">{vehicle.model}</td>
                  <td className="px-6 py-4 text-sm">{vehicle.manufacturer}</td>
                  <td className="px-6 py-4 text-sm">{vehicle.year}</td>
                  <td className="px-6 py-4">
                    <span className={getStatusBadgeClass(vehicle.status)}>{vehicle.status}</span>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => handleEdit(vehicle)}
                      className="p-2 hover:bg-[#E5E5E5] transition-colors duration-150"
                      data-testid={`edit-vehicle-${vehicle.id}`}
                    >
                      <Pencil size={18} weight="regular" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold tracking-tight">
              {editingVehicle ? 'Edit Vehicle' : 'Add New Vehicle'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-[#525252] mb-2 block">
                Registration Number
              </label>
              <input
                type="text"
                value={formData.registration_number}
                onChange={(e) => setFormData({ ...formData, registration_number: e.target.value })}
                className="w-full px-4 py-2 border border-[#E5E5E5] focus:outline-none focus:ring-2 focus:ring-[#0047FF] focus:ring-offset-2 text-sm"
                required
                data-testid="registration-input"
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-[#525252] mb-2 block">
                Vehicle Type
              </label>
              <Select value={formData.vehicle_type} onValueChange={(value) => setFormData({ ...formData, vehicle_type: value })}>
                <SelectTrigger data-testid="vehicle-type-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SEDAN">Sedan</SelectItem>
                  <SelectItem value="SUV">SUV</SelectItem>
                  <SelectItem value="HATCHBACK">Hatchback</SelectItem>
                  <SelectItem value="EV">Electric Vehicle</SelectItem>
                  <SelectItem value="LUXURY">Luxury</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-[#525252] mb-2 block">
                  Model
                </label>
                <input
                  type="text"
                  value={formData.model}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  className="w-full px-4 py-2 border border-[#E5E5E5] focus:outline-none focus:ring-2 focus:ring-[#0047FF] focus:ring-offset-2 text-sm"
                  required
                  data-testid="model-input"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-[#525252] mb-2 block">
                  Manufacturer
                </label>
                <input
                  type="text"
                  value={formData.manufacturer}
                  onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                  className="w-full px-4 py-2 border border-[#E5E5E5] focus:outline-none focus:ring-2 focus:ring-[#0047FF] focus:ring-offset-2 text-sm"
                  required
                  data-testid="manufacturer-input"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-[#525252] mb-2 block">
                  Year
                </label>
                <input
                  type="number"
                  value={formData.year}
                  onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 border border-[#E5E5E5] focus:outline-none focus:ring-2 focus:ring-[#0047FF] focus:ring-offset-2 text-sm"
                  required
                  data-testid="year-input"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-[#525252] mb-2 block">
                  Capacity
                </label>
                <input
                  type="number"
                  value={formData.capacity}
                  onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 border border-[#E5E5E5] focus:outline-none focus:ring-2 focus:ring-[#0047FF] focus:ring-offset-2 text-sm"
                  required
                  data-testid="capacity-input"
                />
              </div>
            </div>
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2 border border-[#E5E5E5] text-sm font-medium hover:bg-[#F5F5F5] transition-colors duration-150"
                data-testid="cancel-button"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-[#0047FF] text-white text-sm font-semibold hover:bg-[#003BCC] transition-colors duration-150"
                data-testid="save-vehicle-button"
              >
                {editingVehicle ? 'Update' : 'Add'} Vehicle
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FleetManagement;
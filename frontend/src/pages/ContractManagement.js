import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Plus, Handshake, PencilSimple, FilePdf, Upload, Trash, CaretDown, CaretUp, SpinnerGap } from '@phosphor-icons/react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const API_BASE = `${process.env.REACT_APP_BACKEND_URL}/api`;

const CONTRACT_TYPES = [
  { value: 'FIXED_MONTHLY', label: 'Fixed Monthly', description: 'Fixed monthly amount' },
  { value: 'PER_KM', label: 'Per KM', description: 'Rate per kilometer' },
  { value: 'PER_DAY', label: 'Per Day', description: 'Daily rate' },
  { value: 'PACKAGE', label: 'Package', description: 'e.g., 8hr/80km packages' },
  { value: 'ROUTE_BASED', label: 'Route Based', description: 'Fixed route pricing' },
  { value: 'HYBRID', label: 'Hybrid', description: 'Base + usage' },
  { value: 'MANUAL', label: 'Manual Pricing', description: 'Enter final amount during billing' }
];

const BILLING_CYCLES = [
  { value: 'WEEKLY', label: 'Weekly' },
  { value: 'BIWEEKLY', label: 'Bi-Weekly' },
  { value: 'MONTHLY', label: 'Monthly' }
];

const VEHICLE_CATEGORIES = [
  { value: 'HATCHBACK', label: 'Hatchback', examples: 'Swift, Celerio, i10' },
  { value: 'SEDAN', label: 'Sedan', examples: 'Dzire, Xcent, Etios' },
  { value: 'SUV', label: 'SUV', examples: 'Ertiga, Innova, Marazzo' },
  { value: 'PREMIUM_SUV', label: 'Premium SUV', examples: 'Innova Crysta, Fortuner' },
  { value: 'LUXURY', label: 'Luxury', examples: 'Mercedes, BMW, Audi' },
  { value: 'EV', label: 'Electric Vehicle', examples: 'Nexon EV, Tiago EV' }
];

const emptyRateCard = {
  vehicle_category: '',
  vehicle_examples: '',
  local_4hr_40km: '',
  local_8hr_80km: '',
  local_12hr_120km: '',
  local_extra_km: '',
  local_extra_hour: '',
  local_driver_allowance: '',  // Daily driver allowance for local packages
  outstation_per_km: '',
  outstation_min_km_per_day: '300',
  outstation_driver_allowance: '',
  monthly_rental: '',
  monthly_included_km: '',
  monthly_extra_km: ''
};

const emptyFixedRoute = {
  route_name: '',
  from_location: '',
  to_location: '',
  one_way_rates: {},
  round_trip_rates: {},
  max_km_included: '',  // Max KM included in the fixed route price
  includes_toll: true,
  notes: ''
};

const ContractManagement = () => {
  const [contracts, setContracts] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showRateCardModal, setShowRateCardModal] = useState(false);
  const [editingContract, setEditingContract] = useState(null);
  const [expandedContract, setExpandedContract] = useState(null);
  const [extracting, setExtracting] = useState(false);
  const [pdfUrl, setPdfUrl] = useState('');
  const [pdfFile, setPdfFile] = useState(null);
  
  // Basic form data
  const [formData, setFormData] = useState({
    client_id: '',
    name: '',
    contract_type: '',
    start_date: '',
    end_date: '',
    billing_cycle: 'MONTHLY',
    source_pdf_url: ''
  });
  
  // Rate cards
  const [vehicleRateCards, setVehicleRateCards] = useState([]);
  const [editingRateCard, setEditingRateCard] = useState(null);
  const [rateCardForm, setRateCardForm] = useState({ ...emptyRateCard });
  
  // Fixed routes
  const [fixedRoutes, setFixedRoutes] = useState([]);
  
  // Extra charges config
  const [extraChargesConfig, setExtraChargesConfig] = useState({
    driver_night_allowance: '250',
    waiting_charge_per_hour: '100',
    gst_percentage: '5',
    toll_included: false,
    parking_included: false,
    state_tax_included: false,
    permit_included: false,
    notes: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [contractsRes, clientsRes] = await Promise.all([
        axios.get(`${API_BASE}/contracts`),
        axios.get(`${API_BASE}/clients`)
      ]);
      setContracts(contractsRes.data);
      setClients(clientsRes.data);
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      client_id: '',
      name: '',
      contract_type: '',
      start_date: '',
      end_date: '',
      billing_cycle: 'MONTHLY',
      source_pdf_url: ''
    });
    setVehicleRateCards([]);
    setFixedRoutes([]);
    setExtraChargesConfig({
      driver_night_allowance: '250',
      waiting_charge_per_hour: '100',
      gst_percentage: '5',
      toll_included: false,
      parking_included: false,
      state_tax_included: false,
      permit_included: false,
      notes: ''
    });
    setEditingContract(null);
    setPdfUrl('');
    setPdfFile(null);
  };

  // Extract rates from PDF
  const handleExtractFromPdf = async () => {
    if (!pdfUrl) {
      toast.error('Please enter a PDF URL');
      return;
    }
    
    setExtracting(true);
    try {
      const response = await axios.post(`${API_BASE}/contracts/extract-from-pdf`, null, {
        params: { pdf_url: pdfUrl }
      });
      
      if (response.data.success) {
        const data = response.data.extracted_data;
        
        // Populate vehicle rate cards
        if (data.vehicle_rate_cards?.length > 0) {
          setVehicleRateCards(data.vehicle_rate_cards.map(card => ({
            ...emptyRateCard,
            ...card,
            local_4hr_40km: card.local_4hr_40km || '',
            local_8hr_80km: card.local_8hr_80km || '',
            local_12hr_120km: card.local_12hr_120km || '',
            local_extra_km: card.local_extra_km || '',
            local_extra_hour: card.local_extra_hour || '',
            outstation_per_km: card.outstation_per_km || '',
            outstation_min_km_per_day: card.outstation_min_km_per_day || '300',
            outstation_driver_allowance: card.outstation_driver_allowance || '',
            monthly_rental: card.monthly_rental || '',
            monthly_included_km: card.monthly_included_km || '',
            monthly_extra_km: card.monthly_extra_km || ''
          })));
        }
        
        // Populate fixed routes
        if (data.fixed_routes?.length > 0) {
          setFixedRoutes(data.fixed_routes);
        }
        
        // Populate extra charges config
        if (data.extra_charges_config) {
          setExtraChargesConfig(prev => ({
            ...prev,
            ...data.extra_charges_config,
            driver_night_allowance: data.extra_charges_config.driver_night_allowance || '250',
            waiting_charge_per_hour: data.extra_charges_config.waiting_charge_per_hour || '100',
            gst_percentage: data.extra_charges_config.gst_percentage || '5'
          }));
        }
        
        // Set contract name from company if available
        if (data.company_name && !formData.name) {
          setFormData(prev => ({ ...prev, name: `${data.company_name} Contract` }));
        }
        
        setFormData(prev => ({ ...prev, source_pdf_url: pdfUrl }));
        
        toast.success(`Extracted ${data.vehicle_rate_cards?.length || 0} vehicle categories and ${data.fixed_routes?.length || 0} routes`);
      } else {
        toast.error(response.data.error || 'Failed to extract rates');
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to extract rates from PDF');
    } finally {
      setExtracting(false);
    }
  };

  // Extract rates from uploaded PDF file
  const handleExtractFromFile = async () => {
    if (!pdfFile) {
      toast.error('Please select a PDF file');
      return;
    }
    
    setExtracting(true);
    try {
      const formDataUpload = new FormData();
      formDataUpload.append('file', pdfFile);
      
      const response = await axios.post(`${API_BASE}/contracts/extract-from-upload`, formDataUpload, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      if (response.data.success) {
        const data = response.data.extracted_data;
        
        // Populate vehicle rate cards
        if (data.vehicle_rate_cards?.length > 0) {
          setVehicleRateCards(data.vehicle_rate_cards.map(card => ({
            ...emptyRateCard,
            ...card,
            local_4hr_40km: card.local_4hr_40km || '',
            local_8hr_80km: card.local_8hr_80km || '',
            local_12hr_120km: card.local_12hr_120km || '',
            local_extra_km: card.local_extra_km || '',
            local_extra_hour: card.local_extra_hour || '',
            outstation_per_km: card.outstation_per_km || '',
            outstation_min_km_per_day: card.outstation_min_km_per_day || '300',
            outstation_driver_allowance: card.outstation_driver_allowance || '',
            monthly_rental: card.monthly_rental || '',
            monthly_included_km: card.monthly_included_km || '',
            monthly_extra_km: card.monthly_extra_km || ''
          })));
        }
        
        // Populate fixed routes
        if (data.fixed_routes?.length > 0) {
          setFixedRoutes(data.fixed_routes);
        }
        
        // Populate extra charges config
        if (data.extra_charges_config) {
          setExtraChargesConfig(prev => ({
            ...prev,
            ...data.extra_charges_config,
            driver_night_allowance: data.extra_charges_config.driver_night_allowance || '250',
            waiting_charge_per_hour: data.extra_charges_config.waiting_charge_per_hour || '100',
            gst_percentage: data.extra_charges_config.gst_percentage || '5'
          }));
        }
        
        // Set contract name from company if available
        if (data.company_name && !formData.name) {
          setFormData(prev => ({ ...prev, name: `${data.company_name} Contract` }));
        }
        
        toast.success(`Extracted ${data.vehicle_rate_cards?.length || 0} vehicle categories and ${data.fixed_routes?.length || 0} routes from ${pdfFile.name}`);
      } else {
        toast.error(response.data.error || 'Failed to extract rates');
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to extract rates from PDF');
    } finally {
      setExtracting(false);
    }
  };

  // Rate Card Management
  const handleAddRateCard = () => {
    setEditingRateCard(null);
    setRateCardForm({ ...emptyRateCard });
    setShowRateCardModal(true);
  };

  const handleEditRateCard = (index) => {
    setEditingRateCard(index);
    setRateCardForm({ ...vehicleRateCards[index] });
    setShowRateCardModal(true);
  };

  const handleSaveRateCard = () => {
    if (!rateCardForm.vehicle_category) {
      toast.error('Please select a vehicle category');
      return;
    }
    
    if (editingRateCard !== null) {
      const updated = [...vehicleRateCards];
      updated[editingRateCard] = rateCardForm;
      setVehicleRateCards(updated);
    } else {
      setVehicleRateCards([...vehicleRateCards, rateCardForm]);
    }
    
    setShowRateCardModal(false);
    setRateCardForm({ ...emptyRateCard });
    setEditingRateCard(null);
  };

  const handleDeleteRateCard = (index) => {
    if (window.confirm('Remove this vehicle rate card?')) {
      setVehicleRateCards(vehicleRateCards.filter((_, i) => i !== index));
    }
  };

  // Fixed Route Management
  const handleAddRoute = () => {
    setFixedRoutes([...fixedRoutes, { ...emptyFixedRoute, route_name: `Route ${fixedRoutes.length + 1}` }]);
  };

  const handleUpdateRoute = (index, field, value) => {
    const updated = [...fixedRoutes];
    if (field.includes('.')) {
      const [parent, child, subChild] = field.split('.');
      if (subChild) {
        updated[index][parent][child] = { ...updated[index][parent][child], [subChild]: value };
      } else {
        updated[index][parent] = { ...updated[index][parent], [child]: value };
      }
    } else {
      updated[index][field] = value;
    }
    setFixedRoutes(updated);
  };

  const handleDeleteRoute = (index) => {
    setFixedRoutes(fixedRoutes.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Prepare payload
    const payload = {
      ...formData,
      start_date: new Date(formData.start_date).toISOString(),
      end_date: new Date(formData.end_date).toISOString(),
      vehicle_rate_cards: vehicleRateCards.map(card => ({
        ...card,
        local_4hr_40km: card.local_4hr_40km ? parseFloat(card.local_4hr_40km) : null,
        local_8hr_80km: card.local_8hr_80km ? parseFloat(card.local_8hr_80km) : null,
        local_12hr_120km: card.local_12hr_120km ? parseFloat(card.local_12hr_120km) : null,
        local_extra_km: card.local_extra_km ? parseFloat(card.local_extra_km) : null,
        local_extra_hour: card.local_extra_hour ? parseFloat(card.local_extra_hour) : null,
        outstation_per_km: card.outstation_per_km ? parseFloat(card.outstation_per_km) : null,
        outstation_min_km_per_day: card.outstation_min_km_per_day ? parseFloat(card.outstation_min_km_per_day) : 300,
        outstation_driver_allowance: card.outstation_driver_allowance ? parseFloat(card.outstation_driver_allowance) : null,
        monthly_rental: card.monthly_rental ? parseFloat(card.monthly_rental) : null,
        monthly_included_km: card.monthly_included_km ? parseFloat(card.monthly_included_km) : null,
        monthly_extra_km: card.monthly_extra_km ? parseFloat(card.monthly_extra_km) : null
      })),
      fixed_routes: fixedRoutes,
      extra_charges_config: {
        ...extraChargesConfig,
        driver_night_allowance: parseFloat(extraChargesConfig.driver_night_allowance) || 250,
        waiting_charge_per_hour: parseFloat(extraChargesConfig.waiting_charge_per_hour) || 100,
        gst_percentage: parseFloat(extraChargesConfig.gst_percentage) || 5
      }
    };
    
    try {
      if (editingContract) {
        await axios.put(`${API_BASE}/contracts/${editingContract.id}`, payload);
        toast.success('Contract updated successfully');
      } else {
        await axios.post(`${API_BASE}/contracts`, payload);
        toast.success('Contract created successfully');
      }
      setShowModal(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Operation failed');
    }
  };

  const openEditModal = (contract) => {
    setEditingContract(contract);
    setFormData({
      client_id: contract.client_id,
      name: contract.name,
      contract_type: contract.contract_type,
      start_date: contract.start_date?.split('T')[0] || '',
      end_date: contract.end_date?.split('T')[0] || '',
      billing_cycle: contract.billing_cycle || 'MONTHLY',
      source_pdf_url: contract.source_pdf_url || ''
    });
    setVehicleRateCards(contract.vehicle_rate_cards || []);
    setFixedRoutes(contract.fixed_routes || []);
    setExtraChargesConfig(contract.extra_charges_config || {
      driver_night_allowance: '250',
      waiting_charge_per_hour: '100',
      gst_percentage: '5',
      toll_included: false,
      parking_included: false,
      state_tax_included: false,
      permit_included: false,
      notes: ''
    });
    setShowModal(true);
  };

  const getClientName = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    return client?.company_name || 'Unknown';
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#0047FF] border-t-transparent rounded-sm animate-spin mx-auto mb-4"></div>
          <p className="text-sm text-[#525252]">Loading contracts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6" data-testid="contracts-page">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight" data-testid="contracts-title">Contract Management</h1>
          <p className="text-xs text-[#525252] uppercase tracking-widest mt-2">Rate Cards & Pricing Agreements</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowModal(true); }}
          className="flex items-center gap-2 bg-[#0047FF] text-white px-6 py-3 font-semibold text-sm hover:bg-[#003BCC] transition-colors duration-150"
          data-testid="create-contract-button"
        >
          <Plus size={20} weight="bold" />
          Create Contract
        </button>
      </div>

      {/* Contract Cards */}
      <div className="space-y-4">
        {contracts.length === 0 ? (
          <div className="bg-white border border-[#E5E5E5] p-12 text-center">
            <Handshake size={48} className="mx-auto mb-4 text-[#E5E5E5]" />
            <p className="text-sm text-[#525252]">No contracts found. Create your first contract.</p>
          </div>
        ) : (
          contracts.map((contract) => (
            <div key={contract.id} className="bg-white border border-[#E5E5E5]" data-testid={`contract-card-${contract.id}`}>
              {/* Contract Header */}
              <div 
                className="p-6 cursor-pointer hover:bg-[#FAFAFA] transition-colors"
                onClick={() => setExpandedContract(expandedContract === contract.id ? null : contract.id)}
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-[#E6EFFF] flex items-center justify-center">
                      <Handshake size={24} weight="regular" className="text-[#0047FF]" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">{contract.name}</h3>
                      <p className="text-sm text-[#525252]">{getClientName(contract.client_id)}</p>
                      <div className="flex gap-4 mt-2">
                        <span className="text-xs px-2 py-1 bg-[#E6EFFF] text-[#0047FF] font-semibold">
                          {CONTRACT_TYPES.find(t => t.value === contract.contract_type)?.label || contract.contract_type}
                        </span>
                        <span className="text-xs text-[#525252]">
                          {new Date(contract.start_date).toLocaleDateString()} - {new Date(contract.end_date).toLocaleDateString()}
                        </span>
                        {contract.vehicle_rate_cards?.length > 0 && (
                          <span className="text-xs text-green-600 font-medium">
                            {contract.vehicle_rate_cards.length} Vehicle Categories
                          </span>
                        )}
                        {contract.fixed_routes?.length > 0 && (
                          <span className="text-xs text-purple-600 font-medium">
                            {contract.fixed_routes.length} Fixed Routes
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={(e) => { e.stopPropagation(); openEditModal(contract); }}
                      className="p-2 text-[#525252] hover:text-[#0047FF] hover:bg-[#E6EFFF] transition-colors"
                      data-testid={`edit-contract-${contract.id}`}
                    >
                      <PencilSimple size={20} />
                    </button>
                    {expandedContract === contract.id ? <CaretUp size={20} /> : <CaretDown size={20} />}
                  </div>
                </div>
              </div>

              {/* Expanded Content */}
              {expandedContract === contract.id && (
                <div className="border-t border-[#E5E5E5] p-6 bg-[#FAFAFA]">
                  {/* Vehicle Rate Cards */}
                  {contract.vehicle_rate_cards?.length > 0 && (
                    <div className="mb-6">
                      <h4 className="text-sm font-semibold uppercase tracking-wider text-[#525252] mb-3">Vehicle Rate Cards</h4>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm bg-white border border-[#E5E5E5]">
                          <thead className="bg-[#F5F5F5]">
                            <tr>
                              <th className="text-left px-4 py-2 font-semibold">Vehicle</th>
                              <th className="text-right px-4 py-2 font-semibold">4Hr/40Km</th>
                              <th className="text-right px-4 py-2 font-semibold">8Hr/80Km</th>
                              <th className="text-right px-4 py-2 font-semibold">Extra KM</th>
                              <th className="text-right px-4 py-2 font-semibold">Extra Hr</th>
                              <th className="text-right px-4 py-2 font-semibold">Outstation/KM</th>
                            </tr>
                          </thead>
                          <tbody>
                            {contract.vehicle_rate_cards.map((card, idx) => (
                              <tr key={idx} className="border-t border-[#E5E5E5]">
                                <td className="px-4 py-2">
                                  <span className="font-medium">{card.vehicle_category}</span>
                                  {card.vehicle_examples && <span className="text-xs text-[#525252] block">{card.vehicle_examples}</span>}
                                </td>
                                <td className="text-right px-4 py-2">{card.local_4hr_40km ? `₹${card.local_4hr_40km}` : '-'}</td>
                                <td className="text-right px-4 py-2">{card.local_8hr_80km ? `₹${card.local_8hr_80km}` : '-'}</td>
                                <td className="text-right px-4 py-2">{card.local_extra_km ? `₹${card.local_extra_km}` : '-'}</td>
                                <td className="text-right px-4 py-2">{card.local_extra_hour ? `₹${card.local_extra_hour}` : '-'}</td>
                                <td className="text-right px-4 py-2">{card.outstation_per_km ? `₹${card.outstation_per_km}` : '-'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Fixed Routes */}
                  {contract.fixed_routes?.length > 0 && (
                    <div className="mb-6">
                      <h4 className="text-sm font-semibold uppercase tracking-wider text-[#525252] mb-3">Fixed Route Packages</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {contract.fixed_routes.map((route, idx) => (
                          <div key={idx} className="bg-white border border-[#E5E5E5] p-4">
                            <p className="font-semibold mb-2">{route.from_location} → {route.to_location}</p>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              {Object.entries(route.one_way_rates || {}).map(([vehicle, price]) => (
                                <div key={vehicle} className="flex justify-between">
                                  <span className="text-[#525252]">{vehicle} (One-way):</span>
                                  <span className="font-medium">₹{price}</span>
                                </div>
                              ))}
                            </div>
                            {route.includes_toll && <p className="text-xs text-green-600 mt-2">Toll included</p>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Extra Charges */}
                  {contract.extra_charges_config && (
                    <div>
                      <h4 className="text-sm font-semibold uppercase tracking-wider text-[#525252] mb-3">Extra Charges</h4>
                      <div className="bg-white border border-[#E5E5E5] p-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-[#525252]">Driver Night Allowance</p>
                          <p className="font-medium">₹{contract.extra_charges_config.driver_night_allowance || '-'}</p>
                        </div>
                        <div>
                          <p className="text-[#525252]">Waiting Charge/Hr</p>
                          <p className="font-medium">₹{contract.extra_charges_config.waiting_charge_per_hour || '-'}</p>
                        </div>
                        <div>
                          <p className="text-[#525252]">GST</p>
                          <p className="font-medium">{contract.extra_charges_config.gst_percentage || 5}%</p>
                        </div>
                        <div>
                          <p className="text-[#525252]">Inclusions</p>
                          <p className="font-medium text-xs">
                            {[
                              contract.extra_charges_config.toll_included && 'Toll',
                              contract.extra_charges_config.parking_included && 'Parking',
                              contract.extra_charges_config.state_tax_included && 'State Tax'
                            ].filter(Boolean).join(', ') || 'None'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Create/Edit Contract Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold tracking-tight">
              {editingContract ? 'Edit Contract' : 'Create Contract'}
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-6 mt-4">
            {/* PDF Upload Section */}
            <div className="p-4 bg-[#F5F5F5] border border-[#E5E5E5]">
              <div className="flex items-center gap-2 mb-3">
                <FilePdf size={20} className="text-red-500" />
                <span className="text-sm font-semibold">Import from Quotation PDF</span>
              </div>
              
              {/* File Upload Option */}
              <div className="mb-3">
                <label className="text-xs font-medium text-[#525252] mb-1 block">Upload PDF File</label>
                <div className="flex gap-2">
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={(e) => setPdfFile(e.target.files[0])}
                    className="flex-1 px-3 py-2 border border-[#E5E5E5] text-sm bg-white file:mr-3 file:py-1 file:px-3 file:border-0 file:text-sm file:font-medium file:bg-[#0047FF] file:text-white file:cursor-pointer"
                    data-testid="pdf-file-input"
                  />
                  <button
                    type="button"
                    onClick={handleExtractFromFile}
                    disabled={extracting || !pdfFile}
                    className="px-4 py-2 bg-[#0047FF] text-white text-sm font-semibold hover:bg-[#003BCC] disabled:opacity-50 flex items-center gap-2"
                    data-testid="extract-from-file-btn"
                  >
                    {extracting ? <SpinnerGap size={18} className="animate-spin" /> : <Upload size={18} />}
                    {extracting ? 'Extracting...' : 'Extract'}
                  </button>
                </div>
              </div>
              
              {/* OR Divider */}
              <div className="flex items-center gap-3 my-3">
                <div className="flex-1 border-t border-[#E5E5E5]"></div>
                <span className="text-xs text-[#525252] font-medium">OR</span>
                <div className="flex-1 border-t border-[#E5E5E5]"></div>
              </div>
              
              {/* URL Option */}
              <div>
                <label className="text-xs font-medium text-[#525252] mb-1 block">Enter PDF URL</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="https://example.com/quotation.pdf"
                    value={pdfUrl}
                    onChange={(e) => setPdfUrl(e.target.value)}
                    className="flex-1 px-4 py-2 border border-[#E5E5E5] text-sm focus:outline-none focus:ring-2 focus:ring-[#0047FF]"
                    data-testid="pdf-url-input"
                  />
                  <button
                    type="button"
                    onClick={handleExtractFromPdf}
                    disabled={extracting || !pdfUrl}
                    className="px-4 py-2 bg-[#0047FF] text-white text-sm font-semibold hover:bg-[#003BCC] disabled:opacity-50 flex items-center gap-2"
                    data-testid="extract-from-url-btn"
                  >
                    {extracting ? <SpinnerGap size={18} className="animate-spin" /> : <Upload size={18} />}
                    {extracting ? 'Extracting...' : 'Extract'}
                  </button>
                </div>
              </div>
              
              <p className="text-xs text-[#525252] mt-3">AI will automatically extract vehicle rates, routes, and charges from your quotation</p>
            </div>

            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-[#525252] mb-2 block">Client</label>
                <Select value={formData.client_id} onValueChange={(val) => setFormData({ ...formData, client_id: val })}>
                  <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                  <SelectContent>
                    {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-[#525252] mb-2 block">Contract Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-[#E5E5E5] text-sm focus:outline-none focus:ring-2 focus:ring-[#0047FF]"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-[#525252] mb-2 block">Contract Type</label>
                <Select value={formData.contract_type} onValueChange={(val) => setFormData({ ...formData, contract_type: val })}>
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    {CONTRACT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-[#525252] mb-2 block">Billing Cycle</label>
                <Select value={formData.billing_cycle} onValueChange={(val) => setFormData({ ...formData, billing_cycle: val })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {BILLING_CYCLES.map(b => <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-[#525252] mb-2 block">Start Date</label>
                <input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  className="w-full px-4 py-2 border border-[#E5E5E5] text-sm focus:outline-none focus:ring-2 focus:ring-[#0047FF]"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-[#525252] mb-2 block">End Date</label>
                <input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  className="w-full px-4 py-2 border border-[#E5E5E5] text-sm focus:outline-none focus:ring-2 focus:ring-[#0047FF]"
                  required
                />
              </div>
            </div>

            {/* Vehicle Rate Cards */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <label className="text-sm font-semibold uppercase tracking-wider text-[#525252]">Vehicle Rate Cards</label>
                <button type="button" onClick={handleAddRateCard} className="text-sm text-[#0047FF] font-semibold hover:underline flex items-center gap-1">
                  <Plus size={16} /> Add Vehicle Category
                </button>
              </div>
              {vehicleRateCards.length === 0 ? (
                <div className="p-6 border border-dashed border-[#E5E5E5] text-center text-sm text-[#525252]">
                  No vehicle rate cards yet. Click "Add Vehicle Category" or extract from PDF.
                </div>
              ) : (
                <div className="space-y-2">
                  {vehicleRateCards.map((card, idx) => (
                    <div key={idx} className="flex justify-between items-center p-3 bg-[#FAFAFA] border border-[#E5E5E5]">
                      <div>
                        <span className="font-semibold">{card.vehicle_category}</span>
                        <span className="text-sm text-[#525252] ml-2">{card.vehicle_examples}</span>
                        <span className="text-xs ml-4">
                          {card.local_8hr_80km && `8Hr/80Km: ₹${card.local_8hr_80km}`}
                          {card.outstation_per_km && ` | Outstation: ₹${card.outstation_per_km}/km`}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => handleEditRateCard(idx)} className="text-[#0047FF] text-sm hover:underline">Edit</button>
                        <button type="button" onClick={() => handleDeleteRateCard(idx)} className="text-red-500 text-sm hover:underline">Remove</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Fixed Routes (Simplified) */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <label className="text-sm font-semibold uppercase tracking-wider text-[#525252]">Fixed Routes</label>
                <button type="button" onClick={handleAddRoute} className="text-sm text-[#0047FF] font-semibold hover:underline flex items-center gap-1">
                  <Plus size={16} /> Add Route
                </button>
              </div>
              {fixedRoutes.length === 0 ? (
                <div className="p-6 border border-dashed border-[#E5E5E5] text-center text-sm text-[#525252]">
                  No fixed routes. Click "Add Route" to add city-to-city packages.
                </div>
              ) : (
                <div className="space-y-3">
                  {fixedRoutes.map((route, idx) => (
                    <div key={idx} className="p-4 bg-[#FAFAFA] border border-[#E5E5E5]">
                      <div className="flex justify-between items-center mb-3">
                        <input
                          type="text"
                          value={route.from_location}
                          onChange={(e) => handleUpdateRoute(idx, 'from_location', e.target.value)}
                          placeholder="From (e.g., Delhi)"
                          className="w-32 px-2 py-1 border border-[#E5E5E5] text-sm"
                        />
                        <span className="mx-2">→</span>
                        <input
                          type="text"
                          value={route.to_location}
                          onChange={(e) => handleUpdateRoute(idx, 'to_location', e.target.value)}
                          placeholder="To (e.g., Rudrapur)"
                          className="w-32 px-2 py-1 border border-[#E5E5E5] text-sm"
                        />
                        <div className="flex items-center gap-2 ml-4">
                          <span className="text-xs text-[#525252]">Max KM:</span>
                          <input
                            type="number"
                            value={route.max_km_included || ''}
                            onChange={(e) => handleUpdateRoute(idx, 'max_km_included', e.target.value)}
                            placeholder="KM"
                            className="w-16 px-2 py-1 border border-[#E5E5E5] text-sm"
                          />
                        </div>
                        <button type="button" onClick={() => handleDeleteRoute(idx)} className="text-red-500 ml-auto">
                          <Trash size={18} />
                        </button>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-sm">
                        {['SEDAN', 'SUV', 'PREMIUM_SUV'].map(vehicle => (
                          <div key={vehicle} className="flex items-center gap-2">
                            <span className="text-xs text-[#525252] w-20">{vehicle}:</span>
                            <input
                              type="number"
                              value={route.one_way_rates?.[vehicle] || ''}
                              onChange={(e) => handleUpdateRoute(idx, 'one_way_rates', { ...route.one_way_rates, [vehicle]: parseFloat(e.target.value) || 0 })}
                              placeholder="One-way"
                              className="w-20 px-2 py-1 border border-[#E5E5E5] text-sm"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Extra Charges Config */}
            <div>
              <label className="text-sm font-semibold uppercase tracking-wider text-[#525252] mb-3 block">Extra Charges Configuration</label>
              <div className="grid grid-cols-4 gap-4 p-4 bg-[#FAFAFA] border border-[#E5E5E5]">
                <div>
                  <label className="text-xs text-[#525252] mb-1 block">Driver Night Allowance</label>
                  <input
                    type="number"
                    value={extraChargesConfig.driver_night_allowance}
                    onChange={(e) => setExtraChargesConfig({ ...extraChargesConfig, driver_night_allowance: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E5E5E5] text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-[#525252] mb-1 block">Waiting Charge/Hr</label>
                  <input
                    type="number"
                    value={extraChargesConfig.waiting_charge_per_hour}
                    onChange={(e) => setExtraChargesConfig({ ...extraChargesConfig, waiting_charge_per_hour: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E5E5E5] text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-[#525252] mb-1 block">GST %</label>
                  <input
                    type="number"
                    value={extraChargesConfig.gst_percentage}
                    onChange={(e) => setExtraChargesConfig({ ...extraChargesConfig, gst_percentage: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E5E5E5] text-sm"
                  />
                </div>
                <div className="flex flex-col justify-end">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={extraChargesConfig.toll_included}
                      onChange={(e) => setExtraChargesConfig({ ...extraChargesConfig, toll_included: e.target.checked })}
                    />
                    Toll Included
                  </label>
                </div>
              </div>
            </div>

            {/* Submit */}
            <div className="flex gap-3 pt-4 border-t border-[#E5E5E5]">
              <button
                type="button"
                onClick={() => { setShowModal(false); resetForm(); }}
                className="flex-1 px-4 py-2 border border-[#E5E5E5] text-sm font-medium hover:bg-[#F5F5F5]"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-[#0047FF] text-white text-sm font-semibold hover:bg-[#003BCC]"
              >
                {editingContract ? 'Update Contract' : 'Create Contract'}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Rate Card Edit Modal */}
      <Dialog open={showRateCardModal} onOpenChange={setShowRateCardModal}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{editingRateCard !== null ? 'Edit' : 'Add'} Vehicle Rate Card</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-[#525252] mb-2 block">Vehicle Category</label>
                <Select value={rateCardForm.vehicle_category} onValueChange={(val) => {
                  const cat = VEHICLE_CATEGORIES.find(c => c.value === val);
                  setRateCardForm({ ...rateCardForm, vehicle_category: val, vehicle_examples: cat?.examples || '' });
                }}>
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    {VEHICLE_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-[#525252] mb-2 block">Examples</label>
                <input
                  type="text"
                  value={rateCardForm.vehicle_examples}
                  onChange={(e) => setRateCardForm({ ...rateCardForm, vehicle_examples: e.target.value })}
                  placeholder="e.g., Dzire, Xcent"
                  className="w-full px-4 py-2 border border-[#E5E5E5] text-sm"
                />
              </div>
            </div>
            
            <div className="border-t border-[#E5E5E5] pt-4">
              <h4 className="text-sm font-semibold mb-3">Local Packages</h4>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-[#525252] mb-1 block">4Hr/40Km</label>
                  <input type="number" value={rateCardForm.local_4hr_40km} onChange={(e) => setRateCardForm({ ...rateCardForm, local_4hr_40km: e.target.value })} className="w-full px-3 py-2 border border-[#E5E5E5] text-sm" placeholder="₹" />
                </div>
                <div>
                  <label className="text-xs text-[#525252] mb-1 block">8Hr/80Km</label>
                  <input type="number" value={rateCardForm.local_8hr_80km} onChange={(e) => setRateCardForm({ ...rateCardForm, local_8hr_80km: e.target.value })} className="w-full px-3 py-2 border border-[#E5E5E5] text-sm" placeholder="₹" />
                </div>
                <div>
                  <label className="text-xs text-[#525252] mb-1 block">12Hr/120Km</label>
                  <input type="number" value={rateCardForm.local_12hr_120km} onChange={(e) => setRateCardForm({ ...rateCardForm, local_12hr_120km: e.target.value })} className="w-full px-3 py-2 border border-[#E5E5E5] text-sm" placeholder="₹" />
                </div>
                <div>
                  <label className="text-xs text-[#525252] mb-1 block">Extra KM</label>
                  <input type="number" value={rateCardForm.local_extra_km} onChange={(e) => setRateCardForm({ ...rateCardForm, local_extra_km: e.target.value })} className="w-full px-3 py-2 border border-[#E5E5E5] text-sm" placeholder="₹/km" />
                </div>
                <div>
                  <label className="text-xs text-[#525252] mb-1 block">Extra Hour</label>
                  <input type="number" value={rateCardForm.local_extra_hour} onChange={(e) => setRateCardForm({ ...rateCardForm, local_extra_hour: e.target.value })} className="w-full px-3 py-2 border border-[#E5E5E5] text-sm" placeholder="₹/hr" />
                </div>
                <div>
                  <label className="text-xs text-[#525252] mb-1 block">Driver Allowance/Day</label>
                  <input type="number" value={rateCardForm.local_driver_allowance} onChange={(e) => setRateCardForm({ ...rateCardForm, local_driver_allowance: e.target.value })} className="w-full px-3 py-2 border border-[#E5E5E5] text-sm" placeholder="₹/day" />
                </div>
              </div>
            </div>

            <div className="border-t border-[#E5E5E5] pt-4">
              <h4 className="text-sm font-semibold mb-3">Outstation</h4>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-[#525252] mb-1 block">Per KM Rate</label>
                  <input type="number" value={rateCardForm.outstation_per_km} onChange={(e) => setRateCardForm({ ...rateCardForm, outstation_per_km: e.target.value })} className="w-full px-3 py-2 border border-[#E5E5E5] text-sm" placeholder="₹/km" />
                </div>
                <div>
                  <label className="text-xs text-[#525252] mb-1 block">Min KM/Day</label>
                  <input type="number" value={rateCardForm.outstation_min_km_per_day} onChange={(e) => setRateCardForm({ ...rateCardForm, outstation_min_km_per_day: e.target.value })} className="w-full px-3 py-2 border border-[#E5E5E5] text-sm" placeholder="300" />
                </div>
                <div>
                  <label className="text-xs text-[#525252] mb-1 block">Driver Allowance</label>
                  <input type="number" value={rateCardForm.outstation_driver_allowance} onChange={(e) => setRateCardForm({ ...rateCardForm, outstation_driver_allowance: e.target.value })} className="w-full px-3 py-2 border border-[#E5E5E5] text-sm" placeholder="₹/night" />
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t border-[#E5E5E5]">
              <button type="button" onClick={() => setShowRateCardModal(false)} className="flex-1 px-4 py-2 border border-[#E5E5E5] text-sm font-medium hover:bg-[#F5F5F5]">Cancel</button>
              <button type="button" onClick={handleSaveRateCard} className="flex-1 px-4 py-2 bg-[#0047FF] text-white text-sm font-semibold hover:bg-[#003BCC]">Save Rate Card</button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ContractManagement;

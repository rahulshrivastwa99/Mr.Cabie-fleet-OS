import React, { useState } from 'react';
import { Upload, FileText, X } from '@phosphor-icons/react';
import { toast } from 'sonner';

const CSVUploader = ({ onUpload, templateHeaders, sampleData, title = "Upload CSV" }) => {
  const [file, setFile] = useState(null);
  const [parsing, setParsing] = useState(false);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.type === 'text/csv') {
      setFile(selectedFile);
    } else {
      toast.error('Please select a valid CSV file');
    }
  };

  const parseCSV = async () => {
    if (!file) {
      toast.error('Please select a file first');
      return;
    }

    setParsing(true);
    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        toast.error('CSV file is empty or invalid');
        setParsing(false);
        return;
      }

      const headers = lines[0].split(',').map(h => h.trim());
      const data = [];

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        const row = {};
        headers.forEach((header, index) => {
          row[header] = values[index] || '';
        });
        data.push(row);
      }

      onUpload(data);
      setFile(null);
    } catch (error) {
      toast.error('Failed to parse CSV file');
    } finally {
      setParsing(false);
    }
  };

  const downloadTemplate = () => {
    const csvContent = [
      templateHeaders.join(','),
      sampleData.join(',')
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">{title}</h3>
        <button
          onClick={downloadTemplate}
          className="flex items-center gap-2 px-4 py-2 border border-[#E5E5E5] text-sm font-medium hover:bg-[#F5F5F5] transition-colors duration-150"
        >
          <FileText size={18} weight="regular" />
          Download Template
        </button>
      </div>

      <div className="border-2 border-dashed border-[#E5E5E5] rounded p-8 text-center">
        {file ? (
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-3">
              <FileText size={32} className="text-[#0047FF]" />
              <div className="text-left">
                <p className="text-sm font-semibold">{file.name}</p>
                <p className="text-xs text-[#525252]">{(file.size / 1024).toFixed(2)} KB</p>
              </div>
              <button
                onClick={() => setFile(null)}
                className="p-2 hover:bg-[#E5E5E5] rounded transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <button
              onClick={parseCSV}
              disabled={parsing}
              className="px-6 py-2 bg-[#0047FF] text-white text-sm font-semibold hover:bg-[#003BCC] transition-colors duration-150 disabled:opacity-50"
            >
              {parsing ? 'Processing...' : 'Upload & Process'}
            </button>
          </div>
        ) : (
          <div>
            <Upload size={48} className="mx-auto mb-4 text-[#E5E5E5]" />
            <p className="text-sm font-semibold mb-2">Drop CSV file here or click to browse</p>
            <p className="text-xs text-[#525252] mb-4">Only .csv files are supported</p>
            <label className="inline-block px-6 py-2 bg-[#0047FF] text-white text-sm font-semibold hover:bg-[#003BCC] transition-colors duration-150 cursor-pointer">
              Select File
              <input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
          </div>
        )}
      </div>

      <div className="bg-[#F5F5F5] border border-[#E5E5E5] p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-[#525252] mb-2">CSV Format</p>
        <p className="text-xs text-[#525252] font-mono">{templateHeaders.join(', ')}</p>
      </div>
    </div>
  );
};

export default CSVUploader;

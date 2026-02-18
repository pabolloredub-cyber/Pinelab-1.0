
import React, { useState, useEffect } from 'react';
import { Printer } from '../types';
import { Button } from './Button';

interface PrinterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string) => void;
  initialData?: Printer;
}

export const PrinterModal: React.FC<PrinterModalProps> = ({ isOpen, onClose, onSave, initialData }) => {
  const [name, setName] = useState('');

  useEffect(() => {
    if (isOpen) {
      setName(initialData?.name || '');
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onSave(name.trim());
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-slate-800">
              {initialData ? 'Editar Impressora' : 'Nova Impressora'}
            </h2>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-xs font-black uppercase text-slate-400 tracking-widest mb-2">
                Identificação da Máquina
              </label>
              <input 
                autoFocus
                required
                type="text" 
                className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-pinelab-dark outline-none transition-all font-medium text-slate-700"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Ender 3 Pro #05"
              />
            </div>

            <div className="flex gap-3">
              <Button variant="secondary" className="flex-1 h-14 rounded-2xl" type="button" onClick={onClose}>
                Cancelar
              </Button>
              <Button variant="primary" className="flex-1 h-14 rounded-2xl shadow-lg shadow-pinelab-dark/20" type="submit">
                {initialData ? 'Atualizar' : 'Cadastrar'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

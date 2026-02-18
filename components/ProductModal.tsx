
import React, { useState, useRef } from 'react';
import { Product } from '../types';
import { MATERIALS } from '../constants';
import { Button } from './Button';
import { generateProductDescription } from '../services/geminiService';

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (product: Omit<Product, 'id'>) => void;
  initialData?: Product;
}

export const ProductModal: React.FC<ProductModalProps> = ({ isOpen, onClose, onSave, initialData }) => {
  const [formData, setFormData] = useState<Omit<Product, 'id'>>({
    name: initialData?.name || '',
    description: initialData?.description || '',
    imageUrl: initialData?.imageUrl || 'https://picsum.photos/seed/pinelab/400/300',
    estimatedTime: initialData?.estimatedTime || 60,
    material: initialData?.material || MATERIALS[0],
    price: initialData?.price || 0
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleMagicDescription = async () => {
    if (!formData.name) return;
    setIsGenerating(true);
    const desc = await generateProductDescription(formData.name, formData.material);
    setFormData(prev => ({ ...prev, description: desc }));
    setIsGenerating(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, imageUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
          <h2 className="text-xl font-bold text-slate-800">{initialData ? 'Editar Produto' : 'Novo Produto'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>

        <form className="p-6 space-y-4 overflow-y-auto custom-scrollbar" onSubmit={(e) => { e.preventDefault(); onSave(formData); }}>
          <div className="flex flex-col items-center gap-4 mb-4">
            <div className="relative w-full h-40 rounded-xl overflow-hidden border-2 border-dashed border-slate-200 group">
              <img src={formData.imageUrl} alt="Preview" className="w-full h-full object-cover" />
              <button 
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white gap-2"
              >
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                <span className="text-sm font-bold">Alterar Foto</span>
              </button>
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*" 
                onChange={handleFileChange} 
              />
            </div>
            <p className="text-[10px] text-slate-400 uppercase font-bold">Dica: Você pode tirar uma foto direto da câmera do celular</p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Nome do Produto</label>
            <input 
              required
              type="text" 
              className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-pinelab-dark outline-none transition-all"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              placeholder="Ex: Suporte de Headset"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Material</label>
              <select 
                className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-pinelab-dark outline-none"
                value={formData.material}
                onChange={(e) => setFormData({...formData, material: e.target.value})}
              >
                {MATERIALS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Tempo Est. (min)</label>
              <input 
                type="number" 
                className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-pinelab-dark outline-none"
                value={formData.estimatedTime}
                onChange={(e) => setFormData({...formData, estimatedTime: parseInt(e.target.value) || 0})}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-sm font-semibold text-slate-700">Descrição</label>
              <button 
                type="button"
                onClick={handleMagicDescription}
                disabled={isGenerating || !formData.name}
                className="text-xs text-pinelab-dark font-bold flex items-center gap-1 hover:opacity-80 disabled:opacity-50"
              >
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM5 10a1 1 0 01-1 1H3a1 1 0 110-2h1a1 1 0 011 1zM8 16v-1a1 1 0 112 0v1a1 1 0 11-2 0zM13.657 15.657a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM19.101 4.101a1 1 0 010 1.414l-9.493 9.493a1 1 0 01-1.414 0l-4.101-4.101a1 1 0 011.414-1.414l3.394 3.394 8.786-8.786a1 1 0 011.414 0z"></path></svg>
                IA Descrição
              </button>
            </div>
            <textarea 
              rows={2}
              className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-pinelab-dark outline-none resize-none"
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              placeholder="Descreva o produto..."
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Preço Sugerido (R$)</label>
            <input 
              type="number" 
              step="0.01"
              className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-pinelab-dark outline-none"
              value={formData.price}
              onChange={(e) => setFormData({...formData, price: parseFloat(e.target.value) || 0})}
            />
          </div>

          <div className="flex gap-3 pt-4 sticky bottom-0 bg-white">
            <Button variant="secondary" className="flex-1" type="button" onClick={onClose}>Cancelar</Button>
            <Button variant="primary" className="flex-1" type="submit">Salvar Produto</Button>
          </div>
        </form>
      </div>
    </div>
  );
};

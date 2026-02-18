
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Layout } from './components/Layout';
import { Product, QueueItem, PrintStatus, Printer } from './types';
import { INITIAL_PRODUCTS } from './constants';
import { Button } from './components/Button';
import { ProductModal } from './components/ProductModal';
import { PrinterModal } from './components/PrinterModal';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'catalog' | 'queue' | 'printers'>('catalog');
  const [products, setProducts] = useState<Product[]>(() => {
    const saved = localStorage.getItem('pm_products');
    return saved ? JSON.parse(saved) : INITIAL_PRODUCTS;
  });
  const [queue, setQueue] = useState<QueueItem[]>(() => {
    const saved = localStorage.getItem('pm_queue');
    return saved ? JSON.parse(saved) : [];
  });
  const [printers, setPrinters] = useState<Printer[]>(() => {
    const saved = localStorage.getItem('pm_printers');
    if (saved) return JSON.parse(saved);
    return [
      { id: '1', name: 'Ender 3 S1 #01', status: 'Idle' },
      { id: '2', name: 'Ender 3 S1 #02', status: 'Idle' },
      { id: '3', name: 'Bambu Lab P1P #01', status: 'Idle' },
      { id: '4', name: 'Anycubic Photon #01', status: 'Idle' },
    ];
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | undefined>();
  
  const [isPrinterModalOpen, setIsPrinterModalOpen] = useState(false);
  const [editingPrinter, setEditingPrinter] = useState<Printer | undefined>();

  const [searchTerm, setSearchTerm] = useState('');
  const [now, setNow] = useState(Date.now());
  const notifiedItems = useRef<Set<string>>(new Set());

  const [selectingPrinterForItem, setSelectingPrinterForItem] = useState<string | null>(null);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    localStorage.setItem('pm_products', JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    localStorage.setItem('pm_queue', JSON.stringify(queue));
  }, [queue]);

  useEffect(() => {
    localStorage.setItem('pm_printers', JSON.stringify(printers));
  }, [printers]);

  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  const sendNotification = (title: string, body: string) => {
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification(title, { body, icon: '/favicon.ico' });
    }
  };

  useEffect(() => {
    queue.forEach(item => {
      if (item.status === PrintStatus.PRINTING && item.startedAt) {
        const elapsedMs = now - item.startedAt;
        const totalMs = item.estimatedDuration * 60 * 1000;
        if (elapsedMs >= totalMs && !notifiedItems.current.has(item.id)) {
          sendNotification(
            "Impressão Concluída! 🚀", 
            `O produto "${item.productName}" na impressora ${item.printerName} deve estar pronto.`
          );
          notifiedItems.current.add(item.id);
        }
      }
    });
  }, [now, queue]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.material.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [products, searchTerm]);

  const activeQueue = useMemo(() => {
    return queue.filter(item => item.status !== PrintStatus.COMPLETED && item.status !== PrintStatus.FAILED);
  }, [queue]);

  const historyQueue = useMemo(() => {
    return queue.filter(item => item.status === PrintStatus.COMPLETED)
                .sort((a,b) => ((b.completedAt || 0) - (a.completedAt || 0)));
  }, [queue]);

  const addProduct = (productData: Omit<Product, 'id'>) => {
    if (editingProduct) {
      setProducts(prev => prev.map(p => p.id === editingProduct.id ? { ...productData, id: p.id } : p));
    } else {
      const newProduct: Product = { ...productData, id: Date.now().toString() };
      setProducts(prev => [...prev, newProduct]);
    }
    setIsModalOpen(false);
    setEditingProduct(undefined);
  };

  const deleteProduct = (id: string) => {
    if (confirm("Tem certeza que deseja excluir este produto do catálogo? Isso não afetará itens já na fila.")) {
      setProducts(prev => prev.filter(p => p.id !== id));
    }
  };

  const addToQueue = (product: Product) => {
    const newItem: QueueItem = {
      id: Date.now().toString(),
      productId: product.id,
      productName: product.name,
      productImage: product.imageUrl,
      status: PrintStatus.PENDING,
      createdAt: Date.now(),
      estimatedDuration: product.estimatedTime,
      priority: 'Medium'
    };
    setQueue(prev => [...prev, newItem]);
  };

  const startPrinting = (itemId: string, printerId: string) => {
    const printer = printers.find(p => p.id === printerId);
    if (!printer) return;

    setQueue(prev => prev.map(item => 
      item.id === itemId ? { 
        ...item, 
        status: PrintStatus.PRINTING, 
        startedAt: Date.now(),
        printerId: printer.id,
        printerName: printer.name
      } : item
    ));

    setPrinters(prev => prev.map(p => 
      p.id === printerId ? { ...p, status: 'Printing', currentJobId: itemId } : p
    ));

    setSelectingPrinterForItem(null);
  };

  const finishPrinting = (id: string, success: boolean) => {
    const item = queue.find(i => i.id === id);
    if (!item) return;

    if (!success) {
      setQueue(prev => prev.map(i => 
        i.id === id ? { 
          ...i, 
          status: PrintStatus.PENDING, 
          startedAt: undefined,
          printerId: undefined,
          printerName: undefined,
          failedAt: Date.now() 
        } : i
      ));
      alert(`Impressão de "${item.productName}" falhou. O item retornou para a fila.`);
    } else {
      setQueue(prev => prev.map(i => 
        i.id === id ? { 
          ...i, 
          status: PrintStatus.COMPLETED,
          completedAt: Date.now()
        } : i
      ));
    }

    if (item.printerId) {
      setPrinters(prev => prev.map(p => 
        p.id === item.printerId ? { ...p, status: 'Idle', currentJobId: undefined } : p
      ));
    }
    
    notifiedItems.current.delete(id);
  };

  const removeFromQueue = (id: string) => {
    const itemToRemove = queue.find(q => q.id === id);
    if (!itemToRemove) return;

    if (confirm(`Remover "${itemToRemove.productName}" da fila de produção?`)) {
      if (itemToRemove.printerId) {
        setPrinters(prev => prev.map(p => 
          p.id === itemToRemove.printerId ? { ...p, status: 'Idle', currentJobId: undefined } : p
        ));
      }
      setQueue(prev => prev.filter(q => q.id !== id));
      if (selectingPrinterForItem === id) setSelectingPrinterForItem(null);
      notifiedItems.current.delete(id);
    }
  };

  const savePrinter = (name: string) => {
    if (editingPrinter) {
      setPrinters(prev => prev.map(p => p.id === editingPrinter.id ? { ...p, name } : p));
      setQueue(prev => prev.map(item => item.printerId === editingPrinter.id ? { ...item, printerName: name } : item));
    } else {
      const newPrinter: Printer = { id: Date.now().toString(), name, status: 'Idle' };
      setPrinters(prev => [...prev, newPrinter]);
    }
    setEditingPrinter(undefined);
  };

  const removePrinter = (id: string) => {
    const printer = printers.find(p => p.id === id);
    if (printer?.status === 'Printing') {
      alert('Não é possível remover uma impressora em atividade!');
      return;
    }
    if (confirm('Remover esta impressora do sistema permanentemente?')) {
      setPrinters(prev => prev.filter(p => p.id !== id));
    }
  };

  const formatCountdown = (ms: number) => {
    if (ms <= 0) return "CONCLUÍDO";
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <Layout 
      activeTab={activeTab} 
      setActiveTab={setActiveTab} 
      queueCount={activeQueue.length}
    >
      {activeTab === 'catalog' && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Catálogo Pinelab</h1>
              <p className="text-slate-500">Seus modelos 3D exclusivos prontos para impressão.</p>
            </div>
            <Button onClick={() => { setEditingProduct(undefined); setIsModalOpen(true); }} className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
              Novo Produto
            </Button>
          </div>

          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
            <input 
              type="text" 
              placeholder="Buscar por nome ou material..." 
              className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl outline-none shadow-sm focus:ring-2 focus:ring-pinelab-dark"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProducts.map(product => (
              <div key={product.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-lg transition-all flex flex-col group relative">
                <button 
                  onClick={(e) => { e.stopPropagation(); deleteProduct(product.id); }}
                  className="absolute top-3 right-3 z-10 p-2 bg-white/90 backdrop-blur rounded-full text-red-500 shadow-sm opacity-0 group-hover:opacity-100 transition-all hover:bg-red-50"
                  title="Excluir produto"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>

                <div className="h-48 overflow-hidden relative">
                  <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                </div>
                <div className="p-5 flex-1 flex flex-col">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-lg text-slate-800 truncate">{product.name}</h3>
                    <span className="text-xs font-bold text-pinelab-dark bg-pinelab-bg px-2 py-1 rounded">R$ {product.price.toFixed(2)}</span>
                  </div>
                  <p className="text-sm text-slate-500 mb-4 line-clamp-2">{product.description}</p>
                  <div className="mt-auto space-y-3">
                    <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      <span>{product.material}</span>
                      <span className="flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        {Math.floor(product.estimatedTime / 60)}h {product.estimatedTime % 60}m
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="secondary" className="flex-1 text-xs hover:bg-slate-100" onClick={() => { setEditingProduct(product); setIsModalOpen(true); }}>
                        Editar
                      </Button>
                      <Button variant="primary" className="flex-[2] text-xs" onClick={() => addToQueue(product)}>
                        Add à Fila
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'queue' && (
        <div className="space-y-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Fila de Produção</h1>
            <p className="text-slate-500">Acompanhe e gerencie as impressões em tempo real.</p>
          </div>

          <section>
            <h2 className="text-lg font-semibold text-slate-700 mb-4 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></div>
              Ordens em Aberto ({activeQueue.length})
            </h2>
            <div className="flex flex-col gap-5">
              {activeQueue.length === 0 ? (
                <div className="py-20 text-center bg-white rounded-3xl border-2 border-dashed border-slate-200">
                  <div className="mb-4 flex justify-center text-slate-200">
                    <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"></path></svg>
                  </div>
                  <p className="text-slate-400 font-medium">Fila vazia. Adicione produtos pelo catálogo.</p>
                  <Button variant="ghost" className="mt-4 text-pinelab-dark" onClick={() => setActiveTab('catalog')}>Ir para Catálogo</Button>
                </div>
              ) : (
                activeQueue.map((item, index) => {
                  const isPrinting = item.status === PrintStatus.PRINTING;
                  const isActiveDropdown = selectingPrinterForItem === item.id;
                  const totalMs = item.estimatedDuration * 60 * 1000;
                  const elapsedMs = isPrinting && item.startedAt ? now - item.startedAt : 0;
                  const remainingMs = totalMs - elapsedMs;
                  const progress = Math.min(100, Math.max(0, (elapsedMs / totalMs) * 100));
                  const isTimeUp = remainingMs <= 0 && isPrinting;

                  return (
                    /* Ajustado: z-index dinâmico (z-10 se dropdown estiver aberto) para sobrepor outros cards */
                    <div 
                      key={item.id} 
                      className={`bg-white p-5 rounded-2xl border transition-all flex flex-col md:flex-row items-center gap-6 shadow-sm relative ${isActiveDropdown ? 'z-20 ring-2 ring-pinelab-dark/10' : 'z-0'} ${isPrinting ? 'border-pinelab-dark ring-1 ring-pinelab-dark/20' : 'border-slate-200'}`}
                    >
                      {isPrinting && (
                        <div className="absolute top-0 left-0 h-1.5 bg-slate-100 w-full rounded-t-2xl overflow-hidden">
                          <div 
                            className={`h-full transition-all duration-1000 ${isTimeUp ? 'bg-emerald-500 animate-pulse' : 'bg-pinelab-dark'}`} 
                            style={{ width: `${progress}%` }}
                          ></div>
                        </div>
                      )}

                      <div className="flex items-center gap-6 flex-1 w-full">
                        <div className="hidden sm:flex flex-col items-center justify-center bg-slate-50 rounded-xl w-10 h-10 text-xs font-black text-slate-300 border border-slate-100 flex-shrink-0">
                          #{index + 1}
                        </div>
                        
                        <div className="relative w-16 h-16 flex-shrink-0">
                          <img src={item.productImage} className="w-full h-full rounded-xl object-cover shadow-sm border border-slate-100" />
                          {isPrinting && (
                            <div className="absolute -top-1.5 -right-1.5 bg-pinelab-dark text-white p-1 rounded-full shadow-lg z-10">
                              <svg className="w-2.5 h-2.5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                            </div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-lg text-slate-800 truncate leading-tight">{item.productName}</h3>
                          {isPrinting ? (
                            <p className="text-[10px] text-pinelab-dark font-bold uppercase flex items-center gap-1 mt-1">
                              <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9 9V5a1 1 0 112 0v4h1a1 1 0 110 2h-2a1 1 0 01-1-1z" clipRule="evenodd"></path></svg>
                              {item.printerName}
                            </p>
                          ) : (
                            <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Status: Aguardando</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-8 w-full md:w-auto justify-between md:justify-center px-4 md:px-0">
                        {isPrinting ? (
                          <div className="text-right md:text-center min-w-[120px]">
                            <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-0.5">Tempo Restante</p>
                            <div className="text-xl font-black font-mono tracking-tighter text-slate-700 leading-none">
                              {formatCountdown(remainingMs)}
                            </div>
                          </div>
                        ) : (
                          <div className="text-right md:text-center min-w-[120px]">
                            <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-0.5">Duração Est.</p>
                            <p className="text-sm font-bold text-slate-500">{item.estimatedDuration} min</p>
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2 w-full md:w-auto items-center">
                        {item.status === PrintStatus.PENDING ? (
                          <div className="flex-1 relative">
                            <Button 
                              variant="primary" 
                              className="w-full md:w-44 h-12 text-sm font-bold rounded-xl shadow-sm z-10"
                              onClick={() => setSelectingPrinterForItem(isActiveDropdown ? null : item.id)}
                            >
                              {isActiveDropdown ? 'Cancelar' : 'Iniciar Impressão'}
                            </Button>
                            
                            {isActiveDropdown && (
                              /* Ajustado: Shadow maior e z-index altíssimo para garantir sobreposição total */
                              <div className="absolute top-[calc(100%+12px)] right-0 w-64 bg-white border border-slate-200 p-3 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] z-[100] space-y-2 animate-in fade-in slide-in-from-top-4 duration-200">
                                <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-2 px-1">Escolha a Máquina</p>
                                <div className="max-h-60 overflow-y-auto custom-scrollbar space-y-1">
                                  {printers.filter(p => p.status === 'Idle').length === 0 ? (
                                    <div className="p-4 text-center text-xs text-red-400 bg-red-50 rounded-xl font-medium">
                                      Todas as impressoras estão ocupadas no momento.
                                    </div>
                                  ) : (
                                    printers.filter(p => p.status === 'Idle').map(p => (
                                      <button 
                                        key={p.id}
                                        type="button"
                                        onClick={() => startPrinting(item.id, p.id)}
                                        className="w-full text-left px-4 py-3 text-xs font-bold hover:bg-pinelab-bg hover:text-pinelab-dark rounded-xl transition-all border border-transparent hover:border-pinelab-dark/20 flex items-center justify-between group"
                                      >
                                        <span>{p.name}</span>
                                        <svg className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
                                      </button>
                                    ))
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="flex flex-1 md:w-auto gap-2">
                            <Button variant="success" className="flex-1 md:w-32 h-12 font-bold rounded-xl flex items-center justify-center gap-2 text-sm" onClick={() => finishPrinting(item.id, true)}>
                              OK
                            </Button>
                            <Button variant="danger" className="flex-1 md:w-32 h-12 font-bold rounded-xl flex items-center justify-center gap-2 text-sm" onClick={() => finishPrinting(item.id, false)}>
                              ERRO
                            </Button>
                          </div>
                        )}
                        <Button 
                          variant="ghost" 
                          className="w-12 h-12 rounded-xl text-red-400 hover:text-red-600 hover:bg-red-50 flex-shrink-0 transition-all border border-transparent hover:border-red-100 group/trash"
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); removeFromQueue(item.id); }}
                          title="Remover da fila"
                        >
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>

          {historyQueue.length > 0 && (
            <section className="bg-slate-100/50 p-6 rounded-3xl border border-slate-200 relative z-0">
              <div className="flex justify-between items-center mb-6 px-2">
                <h2 className="text-lg font-black text-slate-700 flex items-center gap-3 uppercase tracking-tighter">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path></svg>
                  Histórico de Concluídos
                </h2>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{historyQueue.length} Trabalhos</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {historyQueue.slice(0, 12).map(item => (
                  <div key={item.id} className="bg-white p-3 rounded-2xl flex items-center gap-4 group border border-transparent hover:border-emerald-100 transition-all shadow-sm">
                    <img src={item.productImage} className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-slate-800 text-xs truncate leading-tight">{item.productName}</h4>
                      <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">{item.printerName}</p>
                    </div>
                    <div className="text-right">
                       <p className="text-[9px] font-black text-slate-300 leading-none mb-1">{new Date(item.completedAt || 0).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}</p>
                       <span className="text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-tighter text-emerald-600 bg-emerald-50 border border-emerald-100">SUCESSO</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {activeTab === 'printers' && (
        <div className="space-y-8">
          <div className="flex justify-between items-end">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Parque de Máquinas</h1>
              <p className="text-slate-500">Cadastre e monitore a saúde das suas impressoras.</p>
            </div>
            <Button onClick={() => { setEditingPrinter(undefined); setIsPrinterModalOpen(true); }} className="flex gap-2 items-center h-12 px-6 rounded-2xl shadow-lg">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
              Adicionar Máquina
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {printers.map(printer => (
              <div key={printer.id} className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm relative group hover:shadow-xl transition-all border-b-4 border-b-slate-100 hover:border-b-pinelab-dark">
                <div className="absolute top-4 right-4 flex gap-1 z-10">
                  <button 
                    onClick={(e) => { e.stopPropagation(); setEditingPrinter(printer); setIsPrinterModalOpen(true); }}
                    className="p-2 bg-slate-50 rounded-full text-slate-400 hover:text-pinelab-dark hover:bg-slate-100 transition-all shadow-sm"
                    title="Editar impressora"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); removePrinter(printer.id); }}
                    className="p-2 bg-slate-50 rounded-full text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all shadow-sm"
                    title="Remover impressora"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>

                <div className={`w-16 h-16 rounded-[22px] flex items-center justify-center mb-6 transition-transform group-hover:scale-110 duration-300 ${printer.status === 'Idle' ? 'bg-slate-50 text-slate-400' : 'bg-pinelab-bg text-pinelab-dark shadow-[0_0_30px_rgba(82,196,138,0.3)] animate-pulse'}`}>
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                </div>
                <h3 className="font-black text-slate-800 text-lg">{printer.name}</h3>
                <div className="flex items-center gap-2 mt-2">
                  <div className={`w-2 h-2 rounded-full ${printer.status === 'Idle' ? 'bg-slate-300' : 'bg-pinelab-dark shadow-sm'}`}></div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{printer.status === 'Idle' ? 'Disponível' : 'Trabalhando'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <ProductModal 
        isOpen={isModalOpen} 
        onClose={() => { setIsModalOpen(false); setEditingProduct(undefined); }} 
        onSave={addProduct}
        initialData={editingProduct}
      />

      <PrinterModal
        isOpen={isPrinterModalOpen}
        onClose={() => { setIsPrinterModalOpen(false); setEditingPrinter(undefined); }}
        onSave={savePrinter}
        initialData={editingPrinter}
      />
    </Layout>
  );
};

export default App;

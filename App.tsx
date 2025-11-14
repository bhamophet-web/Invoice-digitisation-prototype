import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { digitizeInvoice } from './services/geminiService';
import type { InvoiceData, LineItem } from './types';
import { UploadIcon, WandIcon, ReceiptIcon, Spinner, KeyIcon, ChevronDownIcon, CameraIcon, AlertTriangleIcon, InformationCircleIcon } from './components/icons';

const API_KEY_STORAGE_KEY = 'gemini-api-key';
const MODEL_STORAGE_KEY = 'gemini-model-selection';

const models: { [key: string]: string } = {
  'gemini-2.5-pro': 'Pro',
  'gemini-2.5-flash': 'Flash',
  'gemini-flash-lite-latest': 'Flash Lite'
};

const getSafeCurrencyCode = (code?: string) => {
    // Basic validation for a 3-letter ISO code. Case-insensitive.
    if (code && /^[a-zA-Z]{3}$/.test(code)) {
      return code.toUpperCase();
    }
    // Return a safe default if the code is invalid, null, or undefined.
    return 'MYR';
};

interface ApiKeyManagerProps {
  apiKey: string;
  setApiKey: (key: string) => void;
}

const ApiKeyManager: React.FC<ApiKeyManagerProps> = ({ apiKey, setApiKey }) => {
  const [localApiKey, setLocalApiKey] = useState(apiKey);
  const [isEditing, setIsEditing] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setApiKey(localApiKey);
    localStorage.setItem(API_KEY_STORAGE_KEY, localApiKey);
    setIsEditing(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000); 
  };
  
  const handleEdit = () => {
    setLocalApiKey(apiKey);
    setIsEditing(true);
  };
  
  if (apiKey && !isEditing) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-green-700 dark:text-green-400">API Key is set</span>
        <button onClick={handleEdit} className="text-sm font-semibold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300">
          Edit
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
      <div className="relative">
        <KeyIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          type="password"
          value={localApiKey}
          onChange={(e) => setLocalApiKey(e.target.value)}
          placeholder="Enter your Gemini API Key"
          className="w-full sm:w-72 pl-10 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-slate-700 dark:border-slate-600 dark:placeholder-slate-400"
          aria-label="Gemini API Key"
        />
      </div>
      <button
        onClick={handleSave}
        disabled={!localApiKey}
        className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg shadow-sm hover:bg-indigo-700 disabled:bg-slate-400 dark:disabled:bg-slate-600"
      >
        {saved ? 'Saved!' : 'Save Key'}
      </button>
    </div>
  );
};

interface ModelSelectorProps {
    selectedModel: string;
    onModelChange: (model: string) => void;
}
  
const ModelSelector: React.FC<ModelSelectorProps> = ({ selectedModel, onModelChange }) => {
    return (
      <div className="relative">
        <select
          id="model-select"
          value={selectedModel}
          onChange={(e) => onModelChange(e.target.value)}
          className="appearance-none w-full sm:w-40 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg py-2 pl-3 pr-10 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          aria-label="Select AI Model"
        >
          {Object.entries(models).map(([key, name]) => (
            <option key={key} value={key}>{name}</option>
          ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-700 dark:text-slate-300">
          <ChevronDownIcon className="h-4 w-4" />
        </div>
      </div>
    );
};

interface FileUploadAreaProps {
  onFileSelect: (file: File) => void;
  isLoading: boolean;
  onUseCameraClick: () => void;
}

const FileUploadArea: React.FC<FileUploadAreaProps> = ({ onFileSelect, isLoading, onUseCameraClick }) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragEnter = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isLoading) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (!isLoading && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFileSelect(e.dataTransfer.files[0]);
    }
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileSelect(e.target.files[0]);
    }
  };

  const baseClasses = "flex flex-col items-center justify-center w-full p-8 text-center border-2 border-dashed rounded-lg cursor-pointer transition-colors duration-300";
  const inactiveClasses = "border-slate-300 bg-slate-50 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:hover:bg-slate-700";
  const activeClasses = "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/50";
  
  return (
    <div className="flex flex-col items-center justify-center w-full h-full">
        <label
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            className={`${baseClasses} ${isDragging ? activeClasses : inactiveClasses}`}
            >
            <UploadIcon className="w-12 h-12 text-slate-400 dark:text-slate-500 mb-4" />
            <p className="text-lg font-semibold text-slate-700 dark:text-slate-300">
                <span className="text-indigo-600 dark:text-indigo-400">Click to upload</span> or drag and drop
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400">PNG, JPG, or WEBP</p>
            <input type="file" className="hidden" accept="image/png, image/jpeg, image/webp" onChange={handleFileChange} disabled={isLoading} />
        </label>
        <div className="relative flex items-center w-full max-w-sm my-4">
            <div className="flex-grow border-t border-slate-300 dark:border-slate-600"></div>
            <span className="flex-shrink mx-4 text-sm font-medium text-slate-400 dark:text-slate-500">OR</span>
            <div className="flex-grow border-t border-slate-300 dark:border-slate-600"></div>
        </div>
        <button
            onClick={onUseCameraClick}
            disabled={isLoading}
            className="inline-flex items-center justify-center px-6 py-2 font-semibold text-indigo-600 border border-indigo-600 rounded-lg hover:bg-indigo-50 dark:text-indigo-400 dark:border-indigo-400 dark:hover:bg-indigo-900/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
            <CameraIcon className="w-5 h-5 mr-2 -ml-1" />
            Use Camera
        </button>
    </div>
  );
};

interface CameraCaptureProps {
    onCapture: (file: File) => void;
    onCancel: () => void;
}
  
const CameraCapture: React.FC<CameraCaptureProps> = ({ onCapture, onCancel }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const [error, setError] = useState<string | null>(null);
  
    useEffect(() => {
      const startCamera = async () => {
        try {
          if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
            if (videoRef.current) {
              videoRef.current.srcObject = stream;
              streamRef.current = stream;
            }
          } else {
            setError("Your browser does not support camera access.");
          }
        } catch (err) {
          console.error("Error accessing camera:", err);
          setError("Could not access the camera. Please check permissions.");
        }
      };
  
      startCamera();
  
      return () => {
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
        }
      };
    }, []);
  
    const handleCapture = () => {
      if (videoRef.current) {
        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        const context = canvas.getContext('2d');
        if (context) {
          context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
          canvas.toBlob((blob) => {
            if (blob) {
              const file = new File([blob], `invoice-capture-${Date.now()}.jpg`, { type: 'image/jpeg' });
              onCapture(file);
            }
          }, 'image/jpeg', 0.95);
        }
      }
    };
  
    if (error) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-center text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
          <h3 className="text-lg font-bold mb-2">Camera Error</h3>
          <p className="text-sm">{error}</p>
          <button onClick={onCancel} className="mt-4 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg shadow-sm hover:bg-indigo-700">
            Back to Upload
          </button>
        </div>
      );
    }
  
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-800/50 rounded-lg">
        <div className="relative w-full flex-grow bg-black rounded-t-lg overflow-hidden">
          <video ref={videoRef} autoPlay playsInline className="w-full h-full object-contain"></video>
        </div>
        <div className="flex-shrink-0 flex items-center justify-center gap-4 p-4 w-full">
            <button
                onClick={handleCapture}
                className="inline-flex items-center justify-center px-8 py-3 font-semibold text-white bg-indigo-600 rounded-lg shadow-md hover:bg-indigo-700"
            >
                <CameraIcon className="w-5 h-5 mr-2" />
                Snap Photo
            </button>
            <button
                onClick={onCancel}
                className="px-6 py-3 font-semibold text-slate-700 bg-slate-200 rounded-lg hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
            >
                Cancel
            </button>
        </div>
      </div>
    );
};

interface InvoicePreviewProps {
  imageUrl: string;
}

const InvoicePreview: React.FC<InvoicePreviewProps> = ({ imageUrl }) => (
  <div className="w-full h-full bg-slate-100 dark:bg-slate-800/50 rounded-lg overflow-hidden flex items-center justify-center p-4 shadow-inner">
    <img src={imageUrl} alt="Invoice preview" className="max-w-full max-h-full object-contain rounded-md" />
  </div>
);

interface ExtractedDataDisplayProps {
  data: InvoiceData | null;
  isLoading: boolean;
  error: string | null;
  discrepancyWarning: string | null;
  aiNote: string | null;
}

const ExtractedDataDisplay: React.FC<ExtractedDataDisplayProps> = ({ data, isLoading, error, discrepancyWarning, aiNote }) => {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center text-slate-500 dark:text-slate-400">
        <Spinner className="w-16 h-16 animate-spin text-indigo-500" />
        <p className="mt-4 text-lg font-medium">Digitizing invoice...</p>
        <p className="text-sm">The AI is working its magic. This might take a moment.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
        <h3 className="text-lg font-bold mb-2">An Error Occurred</h3>
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center text-slate-500 dark:text-slate-400">
        <ReceiptIcon className="w-20 h-20 text-slate-400 dark:text-slate-600" />
        <h3 className="mt-4 text-xl font-semibold text-slate-700 dark:text-slate-300">Extracted Data</h3>
        <p className="mt-1 max-w-md">Upload an invoice and the extracted information will be displayed here, ready for your database.</p>
      </div>
    );
  }

  const DataField = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div>
      <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
      <p className="text-md font-semibold text-slate-800 dark:text-slate-200">{value}</p>
    </div>
  );
  
  const currencyFormatter = useMemo(() => new Intl.NumberFormat('en-US', { 
    style: 'currency', 
    currency: getSafeCurrencyCode(data.currency) 
  }), [data.currency]);

  return (
    <div className="space-y-6 text-slate-800 dark:text-slate-200 h-full overflow-y-auto pr-2">
      {aiNote && (
        <div className="p-4 text-sm text-blue-800 rounded-lg bg-blue-50 dark:bg-slate-900 dark:text-blue-400 border border-blue-300 dark:border-blue-800" role="alert">
            <div className="flex items-center">
                <InformationCircleIcon className="w-5 h-5 mr-2" />
                <span className="font-bold">AI Note from Invoice Analysis</span>
            </div>
            <p className="mt-1.5 ml-7">{aiNote}</p>
        </div>
      )}

      {discrepancyWarning && (
        <div className="p-4 text-sm text-amber-800 rounded-lg bg-amber-50 dark:bg-slate-900 dark:text-amber-400 border border-amber-300 dark:border-amber-800" role="alert">
            <div className="flex items-center">
                <AlertTriangleIcon className="w-5 h-5 mr-2" />
                <span className="font-bold">Digitization Validation Warning</span>
            </div>
            <p className="mt-1.5 ml-7">{discrepancyWarning}</p>
        </div>
      )}

      <div className="p-4 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
        <h2 className="text-2xl font-bold mb-4 text-indigo-700 dark:text-indigo-400">{data.vendorName}</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <DataField label="Invoice #" value={data.invoiceNumber} />
          <DataField label="Invoice Date" value={data.invoiceDate} />
          <DataField label="Due Date" value={data.dueDate || 'N/A'} />
        </div>
      </div>
      
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
        <h3 className="text-lg font-semibold p-4 border-b border-slate-200 dark:border-slate-700">Line Items</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-700 uppercase bg-slate-50 dark:bg-slate-700 dark:text-slate-400">
              <tr>
                <th scope="col" className="px-6 py-3">Description</th>
                <th scope="col" className="px-6 py-3 text-right">Qty</th>
                <th scope="col" className="px-6 py-3 text-right">Unit Price</th>
                <th scope="col" className="px-6 py-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {data.lineItems.map((item, index) => (
                <tr key={index} className="border-b dark:border-slate-700">
                  <td className="px-6 py-4 font-medium whitespace-nowrap">{item.description}</td>
                  <td className="px-6 py-4 text-right">{item.quantity}</td>
                  <td className="px-6 py-4 text-right">{currencyFormatter.format(item.unitPrice)}</td>
                  <td className="px-6 py-4 text-right font-medium">{currencyFormatter.format(item.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4 p-4 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
        <div className="space-y-2">
           {data.taxAmount > 0 && <DataField label="Tax" value={currencyFormatter.format(data.taxAmount)} />}
        </div>
        <div className="text-right">
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Amount</p>
            <p className="text-3xl font-bold text-indigo-700 dark:text-indigo-400">{currencyFormatter.format(data.totalAmount)}</p>
        </div>
      </div>
    </div>
  );
};


export default function App() {
  const [apiKey, setApiKey] = useState<string>('');
  const [selectedModel, setSelectedModel] = useState<string>('gemini-2.5-flash');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [extractedData, setExtractedData] = useState<InvoiceData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [discrepancyWarning, setDiscrepancyWarning] = useState<string | null>(null);
  const [aiNote, setAiNote] = useState<string | null>(null);

  useEffect(() => {
    const savedApiKey = localStorage.getItem(API_KEY_STORAGE_KEY);
    if (savedApiKey) {
      setApiKey(savedApiKey);
    }
    const savedModel = localStorage.getItem(MODEL_STORAGE_KEY);
    if (savedModel && models[savedModel]) {
      setSelectedModel(savedModel);
    }
  }, []);

  const handleModelChange = (model: string) => {
    setSelectedModel(model);
    localStorage.setItem(MODEL_STORAGE_KEY, model);
  };

  const imageUrl = useMemo(() => {
    if (imageFile) {
      return URL.createObjectURL(imageFile);
    }
    return null;
  }, [imageFile]);

  const handleFileSelect = useCallback((file: File) => {
    setImageFile(file);
    setExtractedData(null);
    setError(null);
    setDiscrepancyWarning(null);
    setAiNote(null);
  }, []);

  const handleCapture = (file: File) => {
    handleFileSelect(file);
    setCameraActive(false);
  };

  const handleDigitize = async () => {
    if (!imageFile) {
      setError("Please upload an invoice image first.");
      return;
    }
    if (!apiKey) {
      setError("Please enter your Gemini API key before digitizing.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setExtractedData(null);
    setDiscrepancyWarning(null);
    setAiNote(null);

    try {
      const data = await digitizeInvoice(imageFile, apiKey, selectedModel);

      // Failsafe check for non-invoice documents
      if (data.vendorName === 'Invalid Document') {
        setError(data.notes || 'The uploaded image does not appear to be a valid invoice. Please try another image.');
        setExtractedData(null);
        setIsLoading(false);
        return; 
      }

      setExtractedData(data);
      setAiNote(data.notes || null);

      // Client-side validation for totals
      if (data && data.lineItems) {
        const lineItemsTotal = data.lineItems.reduce((sum, item) => sum + item.amount, 0);
        const calculatedTotal = lineItemsTotal + data.taxAmount;
        const difference = Math.abs(calculatedTotal - data.totalAmount);
        
        // Using a small epsilon for floating point comparison
        if (difference > 0.01) {
            const currencyFormatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: getSafeCurrencyCode(data.currency) });
            const warningMessage = `The sum of extracted line items plus tax (${currencyFormatter.format(calculatedTotal)}) does not match the invoice total (${currencyFormatter.format(data.totalAmount)}). Please review the extracted data.`;
            setDiscrepancyWarning(warningMessage);
        }
      }

    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unknown error occurred during digitization.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setImageFile(null);
    setExtractedData(null);
    setError(null);
    setIsLoading(false);
    setCameraActive(false);
    setDiscrepancyWarning(null);
    setAiNote(null);
    if (imageUrl) {
        URL.revokeObjectURL(imageUrl);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-slate-100 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-4">
            <div className="text-center sm:text-left">
              <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-800 dark:text-white">AI Invoice Digitizer</h1>
              <p className="mt-2 text-lg text-slate-600 dark:text-slate-400">Instantly extract invoice data with Gemini.</p>
            </div>
            <div className="flex flex-col md:flex-row items-center justify-center md:justify-end gap-4 flex-shrink-0">
               <ModelSelector selectedModel={selectedModel} onModelChange={handleModelChange} />
               <ApiKeyManager apiKey={apiKey} setApiKey={setApiKey} />
            </div>
          </div>
        </header>

        <main className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-[70vh] min-h-[600px]">
          <div className="flex flex-col gap-4">
            <div className="flex-grow bg-white dark:bg-slate-800/50 rounded-lg p-4 shadow-md border border-slate-200 dark:border-slate-700">
                {imageUrl ? (
                    <InvoicePreview imageUrl={imageUrl} />
                ) : cameraActive ? (
                    <CameraCapture onCapture={handleCapture} onCancel={() => setCameraActive(false)} />
                ) : (
                    <FileUploadArea onFileSelect={handleFileSelect} isLoading={isLoading} onUseCameraClick={() => setCameraActive(true)} />
                )}
            </div>
            <div className="flex-shrink-0 flex items-center justify-center gap-4">
              <button
                onClick={handleDigitize}
                disabled={!imageFile || isLoading || !apiKey}
                className="inline-flex items-center justify-center px-8 py-3 font-semibold text-white bg-indigo-600 rounded-lg shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-slate-400 disabled:cursor-not-allowed dark:disabled:bg-slate-600 transition-all duration-300 transform hover:scale-105"
                title={!apiKey ? "Please save your API key first" : ""}
              >
                {isLoading ? (
                  <>
                    <Spinner className="w-5 h-5 mr-3 -ml-1 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <WandIcon className="w-5 h-5 mr-2 -ml-1" />
                    Digitize Invoice
                  </>
                )}
              </button>
              {imageFile && (
                <button
                    onClick={handleReset}
                    className="px-6 py-3 font-semibold text-slate-700 bg-slate-200 rounded-lg hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600 transition-colors"
                >
                    Clear
                </button>
              )}
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800/50 rounded-lg p-6 shadow-md border border-slate-200 dark:border-slate-700">
            <ExtractedDataDisplay data={extractedData} isLoading={isLoading} error={error} discrepancyWarning={discrepancyWarning} aiNote={aiNote} />
          </div>
        </main>
      </div>
    </div>
  );
}
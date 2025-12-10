import React, { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Save, X, Upload, ArrowLeft, GripVertical, Briefcase, Image as ImageIcon, ChevronDown, ExternalLink } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { usePageTitle } from '../../contexts/PageTitleContext';
import { useNavigation } from '../../contexts/NavigationContext';
import { useAppSelector } from '../../hooks/useAppSelector';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { addPortfolio, updatePortfolio, deletePortfolio, reorderPortfolios, selectPortfolios, addTransaction } from '../../store/slices/portfoliosSlice';
import { updatePortfolioName } from '../../store/slices/positionsSlice';
import { updateWheelPortfolioName } from '../../store/slices/wheelsSlice';
import type { Portfolio, CurrencyType, ImageMetadata } from '../../types';
import { getCurrencySymbol } from '../../utils/currency';
import { ConfirmDialog } from '../../components/modals/ConfirmDialog';
import { ImageCropModal } from '../../components/modals/ImageCropModal';
import { DEFAULT_PORTFOLIOS } from '../../constants/defaultPortfolios';
import { NumberInput } from '../../components/common/NumberInput';
import { formatNumber } from '../../utils/numberFormat';

export const PortfolioManagement: React.FC = () => {
  const { t } = useTranslation();
  const { setPageTitle } = usePageTitle();
  const { goBack } = useNavigation();
  const dispatch = useAppDispatch();
  const location = useLocation();
  const navigate = useNavigate();
  const portfolios = useAppSelector(selectPortfolios);

  const [editingPortfolioId, setEditingPortfolioId] = useState<string | null>(null);
  const [originalPortfolioName, setOriginalPortfolioName] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    logo: '',
    pricePerContract: 0,
    strategy: '',
    description: '',
    currency: 'USD' as CurrencyType,
    startDate: new Date().toISOString().split('T')[0], // Default to today
    url: '',
    initialCapital: 0,
    currentValue: 0
  });
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoOriginal, setLogoOriginal] = useState<string | null>(null);
  const [logoMetadata, setLogoMetadata] = useState<ImageMetadata | undefined>(undefined);
  const [draggedPortfolioId, setDraggedPortfolioId] = useState<string | null>(null);
  const [dragOverPortfolioId, setDragOverPortfolioId] = useState<string | null>(null);
  const [portfolioToDelete, setPortfolioToDelete] = useState<{ id: string; name: string } | null>(null);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [showDefaultPortfolios, setShowDefaultPortfolios] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDefaultPortfolios(false);
      }
    };

    if (showDefaultPortfolios) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDefaultPortfolios]);

  useEffect(() => {
    setPageTitle(t('portfolios.pageTitle'), t('portfolios.pageSubtitle'));
  }, [setPageTitle, t]);

  // Auto-open add portfolio form ONLY if coming from dashboard with addPortfolio flag
  // OR auto-open edit form if editPortfolioId is provided
  useEffect(() => {
    if (location.state?.addPortfolio && !editingPortfolioId) {
      setEditingPortfolioId('new');
    } else if (location.state?.editPortfolioId && !editingPortfolioId) {
      const portfolio = portfolios.find(b => b.id === location.state.editPortfolioId);
      if (portfolio) {
        handleEditPortfolio(portfolio);
      }
    }
  }, [editingPortfolioId, location.state, portfolios]);

  const handleAddPortfolio = () => {
    setEditingPortfolioId('new');
    setOriginalPortfolioName(null);
    setFormData({ name: '', logo: '', pricePerContract: 0, strategy: '', description: '', currency: 'USD', startDate: new Date().toISOString().split('T')[0], url: '', initialCapital: 0, currentValue: 0 });
    setLogoPreview(null);
    setLogoOriginal(null);
    setLogoMetadata(undefined);
  };

  const handleEditPortfolio = (portfolio: Portfolio) => {
    setEditingPortfolioId(portfolio.id);
    setOriginalPortfolioName(portfolio.name); // Store the original name
    setFormData({
      name: portfolio.name,
      logo: portfolio.logo,
      pricePerContract: portfolio.pricePerContract,
      strategy: portfolio.strategy,
      description: portfolio.description || '',
      currency: portfolio.currency || 'USD',
      startDate: portfolio.startDate || new Date().toISOString().split('T')[0],
      url: portfolio.url || '',
      initialCapital: portfolio.initialCapital || 0,
      currentValue: portfolio.currentValue || 0
    });
    setLogoPreview(portfolio.logo);
    setLogoOriginal(portfolio.logoOriginal || portfolio.logo); // Use original if available, otherwise use logo
    setLogoMetadata(portfolio.logoMetadata);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setImageToCrop(result);
      };
      reader.readAsDataURL(file);
    }
    // Reset input to allow selecting the same file again
    e.target.value = '';
  };

  const handleDefaultPortfolioSelect = (portfolioLogo: string) => {
    // Default logos are set directly without cropping
    setFormData({ ...formData, logo: portfolioLogo });
    setLogoPreview(portfolioLogo);
    setLogoOriginal(null); // Clear original when using default logo
    setLogoMetadata(undefined); // Clear metadata when using default logo
    setShowDefaultPortfolios(false);
  };

  const handleLogoClick = () => {
    // Open crop modal with original image for re-editing
    if (logoOriginal) {
      setImageToCrop(logoOriginal);
    } else if (logoPreview) {
      // Fallback to preview if no original is available
      setImageToCrop(logoPreview);
    }
  };

  const handleCropComplete = (croppedImage: string, metadata: ImageMetadata) => {
    setFormData({ ...formData, logo: croppedImage });
    setLogoPreview(croppedImage);
    setLogoMetadata(metadata);
    // Save the original uncropped image if not already saved
    if (!logoOriginal && imageToCrop) {
      setLogoOriginal(imageToCrop);
    }
    setImageToCrop(null);
  };

  const handleSavePortfolio = () => {
    if (!formData.name || !formData.logo) {
      alert('Please provide both name and logo');
      return;
    }

    // Validate URL format - must start with https://
    if (formData.url && !formData.url.startsWith('https://')) {
      alert('Portfolio URL moet beginnen met https://');
      return;
    }

    if (editingPortfolioId === 'new') {
      // Add new portfolio
      const newPortfolio: Portfolio = {
        id: Date.now().toString(),
        ...formData,
        logoOriginal,
        logoMetadata,
        currentValue: formData.initialCapital, // Initial value equals initial capital
      };
      console.log('Adding new portfolio:', newPortfolio);
      dispatch(addPortfolio(newPortfolio));

      // Log initial deposit transaction if there's initial capital
      if (formData.initialCapital > 0) {
        const depositTransaction = {
          id: `txn-${Date.now()}`,
          portfolio: formData.name,
          date: formData.startDate,
          type: 'deposit' as const,
          amount: formData.initialCapital,
          description: 'Initial capital deposit',
          previousValue: 0,
          newValue: formData.initialCapital,
          createdAt: new Date().toISOString(),
          notes: 'Automatisch gelogd bij aanmaken portfolio'
        };
        dispatch(addTransaction(depositTransaction));
        console.log('Initial deposit logged:', depositTransaction);
      }

      console.log('Portfolio added to Redux');
    } else if (editingPortfolioId) {
      // Update existing portfolio - pass oldName to cascade name changes
      console.log('Updating portfolio:', editingPortfolioId, formData);

      // If name changed, update positions and wheels first
      if (originalPortfolioName && originalPortfolioName !== formData.name) {
        dispatch(updatePortfolioName({ oldName: originalPortfolioName, newName: formData.name }));
        dispatch(updateWheelPortfolioName({ oldName: originalPortfolioName, newName: formData.name }));
      }

      dispatch(updatePortfolio({
        id: editingPortfolioId,
        ...formData,
        logoOriginal,
        logoMetadata,
        oldName: originalPortfolioName || undefined
      }));
      console.log('Portfolio updated in Redux');
    }

    setEditingPortfolioId(null);
    setOriginalPortfolioName(null);
    setFormData({ name: '', logo: '', pricePerContract: 0, strategy: '', description: '', currency: 'USD', startDate: new Date().toISOString().split('T')[0], url: '', initialCapital: 0, currentValue: 0 });
    setLogoPreview(null);
    setLogoOriginal(null);
    setLogoMetadata(undefined);
  };

  const handleCancelEdit = () => {
    // Don't allow cancel if no portfolios exist
    if (portfolios.length === 0) {
      return;
    }
    setEditingPortfolioId(null);
    setOriginalPortfolioName(null);
    setFormData({ name: '', logo: '', pricePerContract: 0, strategy: '', description: '', currency: 'USD', startDate: new Date().toISOString().split('T')[0], url: '', initialCapital: 0, currentValue: 0 });
    setLogoPreview(null);
    setLogoOriginal(null);
    setLogoMetadata(undefined);
  };

  const handleBackNavigation = () => {
    // If we came from another page (like PortfolioDetail), use navigation context
    if (location.state?.editPortfolioId || location.state?.fromPage) {
      goBack();
    } else {
      // Otherwise, use normal cancel behavior
      handleCancelEdit();
    }
  };

  const handleDeletePortfolio = (id: string, name: string) => {
    setPortfolioToDelete({ id, name });
  };

  const confirmDeletePortfolio = () => {
    if (portfolioToDelete) {
      dispatch(deletePortfolio(portfolioToDelete.id));
      setPortfolioToDelete(null);
    }
  };

  const cancelDeletePortfolio = () => {
    setPortfolioToDelete(null);
  };

  const handleDragStart = (e: React.DragEvent, portfolioId: string) => {
    setDraggedPortfolioId(portfolioId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, portfolioId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (draggedPortfolioId !== portfolioId) {
      setDragOverPortfolioId(portfolioId);
    }
  };

  const handleDragLeave = () => {
    setDragOverPortfolioId(null);
  };

  const handleDrop = (e: React.DragEvent, targetPortfolioId: string) => {
    e.preventDefault();
    if (!draggedPortfolioId || draggedPortfolioId === targetPortfolioId) {
      setDraggedPortfolioId(null);
      setDragOverPortfolioId(null);
      return;
    }

    const draggedIndex = portfolios.findIndex(b => b.id === draggedPortfolioId);
    const targetIndex = portfolios.findIndex(b => b.id === targetPortfolioId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    const newPortfolios = [...portfolios];
    const [draggedPortfolio] = newPortfolios.splice(draggedIndex, 1);
    newPortfolios.splice(targetIndex, 0, draggedPortfolio);

    dispatch(reorderPortfolios(newPortfolios));
    setDraggedPortfolioId(null);
    setDragOverPortfolioId(null);
  };

  const handleDragEnd = () => {
    setDraggedPortfolioId(null);
    setDragOverPortfolioId(null);
  };

  // If editing, show edit form
  if (editingPortfolioId) {
    return (
      <div className="space-y-6">
        {/* Edit Form */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          {/* Title with Back Button */}
          <div className="flex items-center gap-3 mb-4">
            {portfolios.length > 0 && (
              <button
                onClick={handleCancelEdit}
                className="p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                title={t('navigation.goBack')}
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {editingPortfolioId === 'new' ? t('portfolios.addNewPortfolio') : t('portfolios.editPortfolio')}
            </h3>
          </div>

          <div className="space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                  {t('portfolios.name')}
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
                  placeholder={t('portfolios.namePlaceholder')}
                />
              </div>

              <div>
                <label className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                  {t('portfolios.logo')}
                </label>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    {/* Logo Preview or Placeholder */}
                    <div
                      className={`w-16 h-16 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center bg-gray-50 dark:bg-gray-900 ${logoPreview ? 'cursor-pointer hover:border-blue-500 dark:hover:border-blue-400 transition-colors' : ''}`}
                      onClick={logoPreview ? handleLogoClick : undefined}
                      title={logoPreview ? t('imageCrop.title') : undefined}
                    >
                      {logoPreview ? (
                        <img
                          src={logoPreview}
                          alt="Logo preview"
                          className="w-full h-full rounded-lg object-cover"
                        />
                      ) : (
                        <Briefcase className="w-8 h-8 text-gray-400 dark:text-gray-600" />
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      <label
                        className="p-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg transition-colors cursor-pointer"
                        title={t('portfolios.uploadCustom')}
                      >
                        <Upload className="w-5 h-5" />
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleLogoUpload}
                          className="hidden"
                        />
                      </label>

                      {/* Default Logo Dropdown */}
                      <div className="relative" ref={dropdownRef}>
                        <button
                          type="button"
                          onClick={() => setShowDefaultPortfolios(!showDefaultPortfolios)}
                          className="p-2.5 bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-400 rounded-lg transition-colors flex items-center gap-1"
                          title={t('portfolios.useDefault')}
                        >
                          <ImageIcon className="w-5 h-5" />
                          <ChevronDown className={`w-3 h-3 transition-transform ${showDefaultPortfolios ? 'rotate-180' : ''}`} />
                        </button>

                        {showDefaultPortfolios && (
                          <div className="absolute top-full left-0 mt-2 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-lg z-50 min-w-max">
                            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 px-1">
                              {t('portfolios.selectDefault')}
                            </p>
                            <div className="flex gap-2">
                              {DEFAULT_PORTFOLIOS.map((portfolio) => (
                                <button
                                  key={portfolio.id}
                                  type="button"
                                  onClick={() => handleDefaultPortfolioSelect(portfolio.logo)}
                                  className="flex flex-col items-center gap-1.5 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                  title={portfolio.name}
                                >
                                  <img
                                    src={portfolio.logo}
                                    alt={portfolio.name}
                                    className="w-10 h-10 rounded-lg object-cover"
                                  />
                                  <span className="text-[10px] text-gray-500 dark:text-gray-400 text-center max-w-[60px] truncate">
                                    {portfolio.name}
                                  </span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                  {t('portfolios.contractPrice')}
                </label>
                <NumberInput
                  value={formData.pricePerContract || 0}
                  onChange={(value) => setFormData({ ...formData, pricePerContract: value })}
                  className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
                  placeholder={t('portfolios.contractPricePlaceholder')}
                />
              </div>

              <div>
                <label className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                  {t('portfolios.currency')}
                </label>
                <select
                  value={formData.currency}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value as CurrencyType })}
                  className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
                >
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                </select>
              </div>

              <div>
                <label className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                  {t('portfolios.portfolioUrl')}
                </label>
                <input
                  type="url"
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
                  placeholder="https://portfolio.com/login"
                />
              </div>

              <div>
                <label className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                  Start Date
                </label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  max={new Date().toISOString().split('T')[0]}
                  className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  First day to track data for this portfolio
                </p>
              </div>

              <div>
                <label className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                  Startkapitaal ({getCurrencySymbol(formData.currency)})
                </label>
                <NumberInput
                  value={formData.initialCapital || 0}
                  onChange={(value) => setFormData({ ...formData, initialCapital: value })}
                  min={0}
                  allowDecimals={false}
                  placeholder="0"
                  className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Initieel kapitaal (0 = geen storting)
                </p>
              </div>
            </div>

            {/* Short Description */}
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                Short Description
              </label>
              <textarea
                value={formData.strategy}
                onChange={(e) => setFormData({ ...formData, strategy: e.target.value })}
                className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
                placeholder="Brief description for card views..."
                rows={2}
              />
            </div>

            {/* Long Description - Extra Information and Goals */}
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                Extra Information & Goals
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
                placeholder="Detailed information, strategies, and goals for this portfolio account..."
                rows={4}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            {portfolios.length > 0 && (
              <button
                onClick={handleCancelEdit}
                className="flex items-center gap-2 px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg font-medium transition-colors"
              >
                <X className="w-4 h-4" />
                {t('common.cancel')}
              </button>
            )}
            <button
              onClick={handleSavePortfolio}
              disabled={!formData.name || !formData.logo}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
            >
              <Save className="w-4 h-4" />
              {t('portfolios.savePortfolio')}
            </button>
          </div>
        </div>

        {/* Image Crop Modal */}
        {imageToCrop && (
          <ImageCropModal
            image={imageToCrop}
            onClose={() => setImageToCrop(null)}
            onCropComplete={handleCropComplete}
            initialMetadata={logoMetadata}
          />
        )}
      </div>
    );
  }

  // Otherwise show portfolio list
  return (
    <div className="space-y-6">
      {/* Empty State */}
      {portfolios.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
          <div className="max-w-md mx-auto">
            <div className="mb-4">
              <Briefcase className="w-16 h-16 mx-auto text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              {t('portfolios.noPortfoliosYet')}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {t('portfolios.noPortfoliosDescription')}
            </p>
            <button
              onClick={handleAddPortfolio}
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors shadow-md"
            >
              <Plus className="w-5 h-5" />
              {t('portfolios.addFirstPortfolio')}
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Portfolios List */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {portfolios.map((portfolio) => (
          <div
            key={portfolio.id}
            draggable
            onDragStart={(e) => handleDragStart(e, portfolio.id)}
            onDragOver={(e) => handleDragOver(e, portfolio.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, portfolio.id)}
            onDragEnd={handleDragEnd}
            onClick={() => handleEditPortfolio(portfolio)}
            className={`bg-white dark:bg-gray-800 rounded-lg border ${
              dragOverPortfolioId === portfolio.id
                ? 'border-blue-500 dark:border-blue-400 border-2'
                : 'border-gray-200 dark:border-gray-700'
            } p-4 flex flex-col justify-between hover:shadow-lg transition-all cursor-pointer ${
              draggedPortfolioId === portfolio.id ? 'opacity-50' : ''
            }`}
          >
            <div>
              <div className="flex items-start gap-3 mb-3">
                <div className="flex items-center gap-1.5">
                  <div className="cursor-grab active:cursor-grabbing text-gray-400 dark:text-gray-500">
                    <GripVertical className="w-4 h-4" />
                  </div>
                  <img
                    src={portfolio.logo}
                    alt={portfolio.name}
                    className="w-12 h-12 rounded-lg object-contain bg-gray-100 dark:bg-gray-700 p-0.5 border border-gray-200 dark:border-gray-600"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white truncate">
                    {portfolio.name}
                  </h3>
                  <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                    {portfolio.strategy || t('portfolios.noDescription')}
                  </p>
                </div>
              </div>

              {/* Contract Price & Currency */}
              <div className="flex items-center gap-3 mb-3">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{t('portfolios.contractPrice')}</p>
                  <p className="text-xs font-medium text-gray-900 dark:text-white">
                    {getCurrencySymbol(portfolio.currency)}{formatNumber(portfolio.pricePerContract, 2)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{t('portfolios.currency')}</p>
                  <p className="text-xs font-medium text-gray-900 dark:text-white">
                    {portfolio.currency}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-1 border-t border-gray-200 dark:border-gray-700 pt-3">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/portfolio/${encodeURIComponent(portfolio.name)}`);
                }}
                className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-full transition-colors"
                title={t('portfolios.viewPortfolio')}
              >
                <Briefcase className="w-3.5 h-3.5" />
              </button>
              {portfolio.url && (
                <a
                  href={portfolio.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="p-1.5 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-full transition-colors"
                  title={t('portfolioDetail.openPortal')}
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeletePortfolio(portfolio.id, portfolio.name);
                }}
                className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-full transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
            ))}
          </div>

          {/* Add Portfolio Button */}
          <div className="flex justify-end">
            <button
              onClick={handleAddPortfolio}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors shadow-md"
            >
              <Plus className="w-5 h-5" />
              {t('portfolios.addPortfolio')}
            </button>
          </div>
        </>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={portfolioToDelete !== null}
        title={t('portfolios.deleteConfirm')}
        message={portfolioToDelete ? `Are you sure you want to delete ${portfolioToDelete.name}? This action cannot be undone.` : ''}
        confirmText={t('common.delete')}
        cancelText={t('common.cancel')}
        onConfirm={confirmDeletePortfolio}
        onCancel={cancelDeletePortfolio}
        variant="danger"
      />

      {/* Image Crop Modal */}
      {imageToCrop && (
        <ImageCropModal
          image={imageToCrop}
          onClose={() => setImageToCrop(null)}
          onCropComplete={handleCropComplete}
          initialMetadata={logoMetadata}
        />
      )}
    </div>
  );
};

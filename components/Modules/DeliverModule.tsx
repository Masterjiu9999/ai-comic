import React from 'react';
import { useTranslation } from '../../services/translationService';

export const DeliverModule: React.FC = () => {
  const { t } = useTranslation();
  return (
    <div className="h-full flex items-center justify-center bg-gray-950">
        <div className="text-center">
             <h2 className="text-xl text-gray-300 font-bold mb-4">{t('export_nle')}</h2>
             <div className="flex gap-4">
                 <button className="px-6 py-3 bg-brand-blue text-white rounded font-bold shadow-lg hover:bg-blue-500">
                     {t('export_xml')}
                 </button>
                 <button className="px-6 py-3 bg-gray-800 text-white rounded font-bold border border-gray-600 hover:bg-gray-700">
                     {t('render_preview')}
                 </button>
             </div>
        </div>
    </div>
  );
};
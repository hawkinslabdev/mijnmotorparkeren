import React, { useState } from 'react'
import { promoBarItems, type PromoBarItem } from '@/data/promobar'
import { X } from 'lucide-react'

export const PromoBar: React.FC = () => {
  const [visible, setVisible] = useState(true)

  if (promoBarItems.length === 0) return null

  const currentItem: PromoBarItem = promoBarItems[0]

  if (!visible || !currentItem) return null

  return (
    <div className="w-full bg-[#dbede3] border-b border-green-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 flex items-center justify-center gap-3 text-sm">
        <span className="text-green-900">{currentItem.text}</span>
        {currentItem.link && currentItem.linkText && (
          <a
            href={currentItem.link}
            target="_blank"
            rel="noopener noreferrer"
            className="text-green-800 hover:text-green-900 font-medium transition-colors underline"
          >
            <span className="hidden sm:inline">{currentItem.linkText}</span>
            <span className="sm:hidden">Bekijken</span>
          </a>
        )}
        <button
          onClick={() => setVisible(false)}
          className="ml-2 p-0.5 text-green-700 hover:text-green-900 hover:bg-green-200 rounded transition-colors"
          aria-label="Sluit"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

export default PromoBar

import React from 'react'
import { MapPin, ExternalLink, Calendar, Users, X } from 'lucide-react'
import type { POI } from '@/types/poi'
import { POI_TYPE_CONFIG } from '@/types/poi'

interface POIDetailsProps {
  poi: POI
  onClose: () => void
}

export const POIDetails: React.FC<POIDetailsProps> = ({ poi, onClose }) => {
  const config = POI_TYPE_CONFIG[poi.type]

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Header — matches ParkingRules structure exactly */}
      <div className="relative bg-gradient-to-r from-blue-50 to-indigo-50 p-4 sm:p-6">
        {/* Header buttons; vertically centered */}
        <div className="absolute top-1/2 right-4 transform -translate-y-1/2 flex items-center gap-2">
          {/* Close button */}
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/50 transition-colors"
            aria-label="Sluiten"
          >
            <X className="h-5 w-5 text-gray-600" />
          </button>
        </div>

        {/* POI type label — subtle, above the name */}
        <p className="text-xs font-medium mb-1" style={{ color: config.color }}>
          {config.label}
        </p>

        <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-1 pr-20">{poi.name}</h2>

        {poi.address && (
          <p className="text-sm text-gray-600 flex items-center gap-1">
            <MapPin className="h-3 w-3 flex-shrink-0" />
            {poi.address}
          </p>
        )}
      </div>

      {/* Content */}
      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
        {poi.description && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 sm:p-4">
            <p className="text-sm text-gray-700">{poi.description}</p>
          </div>
        )}

        {poi.capacity && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-600 flex-shrink-0" />
              <p className="text-sm text-blue-900">
                <span className="font-medium">Capaciteit:</span> {poi.capacity} motoren
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Footer — matches ParkingRules footer exactly */}
      <div className="bg-gray-50 -mx-4 sm:-mx-6 -mb-4 sm:-mb-6 px-4 sm:px-6 py-4 border-t border-gray-100">
        <div className="flex flex-col gap-3">
          {poi.source?.date && (
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Calendar className="h-3 w-3" />
              <span>{new Date(poi.source.date).toLocaleDateString('nl-NL')}</span>
            </div>
          )}

          {poi.source && (
            <div className="flex items-center gap-2">
              {poi.source.url ? (
                <a
                  href={poi.source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 transition-colors group"
                >
                  <ExternalLink className="h-3 w-3 group-hover:scale-110 transition-transform" />
                  <span>
                    {poi.source.type === 'reddit'
                      ? 'Reddit'
                      : poi.source.type === 'official'
                        ? 'Officiële bron'
                        : 'Community bijdrage'}
                  </span>
                </a>
              ) : (
                <span className="flex items-center gap-1 text-xs text-gray-400">
                  <ExternalLink className="h-3 w-3" />
                  <span>
                    {poi.source.type === 'official' ? 'Officiële bron' : 'Community bijdrage'}
                  </span>
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

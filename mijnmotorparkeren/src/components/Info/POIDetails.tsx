import React from 'react'
import { MapPin, ExternalLink, Calendar, Users, ArrowLeft } from 'lucide-react'
import type { POI, POIType } from '@/types/poi'
import { POI_TYPE_CONFIG } from '@/types/poi'

interface POIDetailsProps {
  poi: POI
  onClose: () => void
  /** Name of the parent gemeente/city, shown on the back button. */
  parentName?: string
}

// Solid or hollow: not colour alone
export const POIDot: React.FC<{ type: POIType; className?: string }> = ({ type, className }) => {
  const { color, hollow } = POI_TYPE_CONFIG[type]
  return (
    <span
      className={`inline-block rounded-full flex-shrink-0 ${className ?? ''}`}
      style={{ backgroundColor: hollow ? 'transparent' : color, border: `2px solid ${color}` }}
      aria-hidden="true"
    />
  )
}

export const POIDetails: React.FC<POIDetailsProps> = ({ poi, onClose, parentName }) => {
  const config = POI_TYPE_CONFIG[poi.type]

  return (
    <div>
      {/* Header — matches ParkingRules structure exactly */}
      <div>
        {/* Back to the parent gemeente/city */}
        <button
          onClick={onClose}
          className="-ml-1 mb-2 inline-flex min-h-[44px] items-center gap-1.5 rounded-full pr-3 pl-2 text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
          aria-label={parentName ? `Terug naar ${parentName}` : 'Terug'}
        >
          <ArrowLeft className="h-4 w-4 flex-none" aria-hidden="true" />
          <span className="truncate">{parentName ? `Terug naar ${parentName}` : 'Terug'}</span>
        </button>

        {/* POI type label — subtle, above the name */}
        <p className="text-xs font-medium mb-1 text-gray-700 flex items-center gap-1.5">
          <POIDot type={poi.type} className="w-2.5 h-2.5" />
          {config.label}
        </p>

        <h2 className="text-xl font-bold text-gray-900 mb-1">{poi.name}</h2>

        {poi.address && (
          <p className="text-sm text-gray-600 flex items-center gap-1">
            <MapPin className="h-3 w-3 flex-shrink-0" />
            {poi.address}
          </p>
        )}
      </div>

      {/* Content */}
      <div className="mt-4 space-y-4">
        {poi.description && (
          <p className="text-base text-gray-800 leading-relaxed whitespace-pre-line">
            {poi.description}
          </p>
        )}

        {poi.capacity && (
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-gray-500 flex-shrink-0" aria-hidden="true" />
            <p className="text-base text-gray-800">
              <span className="font-medium text-gray-900">Capaciteit:</span> {poi.capacity} motoren
            </p>
          </div>
        )}
      </div>

      {/* Footer — no padded parent here */}
      <div className="mt-5 border-t border-gray-200 pt-2">
        <div className="flex flex-wrap items-center justify-between gap-x-4">
          {poi.source?.date && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Calendar className="h-3.5 w-3.5 flex-none" aria-hidden="true" />
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
                  className="flex items-center gap-1 min-h-11 text-sm text-blue-700 hover:text-blue-800 transition-colors group"
                >
                  <ExternalLink
                    className="h-3.5 w-3.5 flex-none group-hover:scale-110 transition-transform"
                    aria-hidden="true"
                  />
                  <span>
                    {poi.source.type === 'reddit'
                      ? 'Reddit'
                      : poi.source.type === 'official'
                        ? 'Bron'
                        : 'Community bijdrage'}
                  </span>
                </a>
              ) : (
                <span className="flex items-center gap-1 text-sm text-gray-600">
                  <ExternalLink className="h-3.5 w-3.5 flex-none" aria-hidden="true" />
                  <span>
                    {poi.source.type === 'official' ? 'Bron' : 'Community bijdrage'}
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

// src/components/Info/ParkingRules.tsx; Modern, mobile-first design
import React, { useRef, useState } from 'react'
import { Clock, MapPin, AlertTriangle, Bike, X, Check, ExternalLink, Mail, Calendar } from 'lucide-react'
import { Gemeente } from '../../types/gemeente'
import { City } from '../../types/city'
import { clsx } from 'clsx'

interface ParkingRulesProps {
  gemeente?: Gemeente | null
  city?: City | null
  className?: string
  onClose?: () => void
}

export const ParkingRules: React.FC<ParkingRulesProps> = ({ gemeente, city, className, onClose }) => {
  // Use city data if available, otherwise use gemeente data
  const data = city || gemeente
  const isCity = !!city

  // Swipe-to-close state/logic
  const touchStartY = useRef<number | null>(null)
  const [swipeOffset, setSwipeOffset] = useState(0)
  const swipeThreshold = 60 // px

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      touchStartY.current = e.touches[0].clientY
    }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartY.current !== null) {
      const offset = e.touches[0].clientY - touchStartY.current
      setSwipeOffset(offset > 0 ? offset : 0)
    }
  }

  const handleTouchEnd = () => {
    if (swipeOffset > swipeThreshold && onClose) {
      onClose()
    }
    setSwipeOffset(0)
    touchStartY.current = null
  }

  if (!data) {
    return (
      <div className={clsx("p-4 sm:p-6 bg-white rounded-xl shadow-sm border border-gray-100", className)}>
        <div className="text-center text-gray-500">
          <MapPin className="mx-auto mb-3 h-12 w-12 text-gray-300" />
          <p className="text-sm font-medium">Selecteer een gemeente om de parkeerregels te bekijken</p>
        </div>
      </div>
    )
  }

  const { parkingRules } = data

  return (
    <div
      className={clsx(
        "bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden",
        className,
        swipeOffset > 0 ? 'touch-none select-none' : ''
      )}
      style={swipeOffset > 0 ? { transform: `translateY(${swipeOffset}px)`, transition: swipeOffset === 0 ? 'transform 0.2s' : undefined } : undefined}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Header */}
      <div className="relative bg-gradient-to-r from-blue-50 to-indigo-50 p-4 sm:p-6">
        {/* Mobile drag handle */}
        <div className="sm:hidden absolute top-2 left-1/2 transform -translate-x-1/2">
          <div className="w-8 h-1 bg-gray-300 rounded-full" />
        </div>
        
        {/* Header buttons; vertically centered */}
        <div className="absolute top-1/2 right-4 transform -translate-y-1/2 flex items-center gap-2">
          {/* Report/Help button */}
          <a
            href="https://melden.mijnmotorparkeren.nl"
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 rounded-full hover:bg-white/50 transition-colors group"
            title="Probleem melden"
            aria-label="Probleem melden"
          >
            <AlertTriangle className="h-5 w-5 text-rose-400 group-hover:text-rose-600 transition-colors" />
          </a>
          
          {/* Close button */}
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-white/50 transition-colors"
              aria-label="Sluiten"
            >
              <X className="h-5 w-5 text-gray-600" />
            </button>
          )}
        </div>
        
        <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-1 pr-20">
          {data.name}
        </h2>
        
        {/* City indicator if applicable */}
        {isCity && city && (
          <p className="text-sm text-gray-600">
            in Gemeente {city.parent}
          </p>
        )}
      </div>

      {/* Content */}
      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
        {!parkingRules && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-gray-600 text-sm text-center">
            Er zijn geen gegevens over parkeerregels beschikbaar voor deze gemeente.
          </div>
        )}

        {parkingRules && (
          <>
            {/* Motorcycle parking section */}
            {parkingRules.motorcycleSpecific && (
              <div className="space-y-4">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 flex items-center">
                  <Bike className="mr-2 h-5 w-5" />
                  Parkeren
                </h3>

                <div className="grid gap-3 sm:gap-4">
                  {/* Sidewalk parking */}
                  {(parkingRules.motorcycleSpecific.allowedOnSidewalk === true || parkingRules.motorcycleSpecific.allowedOnSidewalk === false) && (
                    <div className={clsx(
                      "rounded-lg p-3 sm:p-4 border",
                      parkingRules.motorcycleSpecific.allowedOnSidewalk
                        ? "bg-green-50 border-green-200"
                        : "bg-red-50 border-red-200"
                    )}>
                      <div className="flex items-center">
                        {parkingRules.motorcycleSpecific.allowedOnSidewalk ? (
                          <Check className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 mr-2" />
                        ) : (
                          <X className="h-4 w-4 sm:h-5 sm:w-5 text-red-600 mr-2" />
                        )}
                        <span className={clsx(
                          "text-sm sm:text-base font-medium",
                          parkingRules.motorcycleSpecific.allowedOnSidewalk
                            ? "text-green-900"
                            : "text-red-900"
                        )}>
                          Parkeren op stoep {parkingRules.motorcycleSpecific.allowedOnSidewalk ? 'toegestaan' : 'verboden'}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Free in paid zones */}
                  {parkingRules.motorcycleSpecific.freeInPaidZones === true && (
                    <div className={clsx(
                      "rounded-lg p-3 sm:p-4 border bg-green-50 border-green-200"
                    )}>
                      <div className="flex items-center">
                        <Check className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 mr-2" />
                        <span className="text-sm sm:text-base font-medium text-green-900">
                          Gratis in betaalzones
                        </span>
                      </div>
                    </div>
                  )}
                  {parkingRules.motorcycleSpecific.freeInPaidZones === false && (
                    <div className={clsx(
                      "rounded-lg p-3 sm:p-4 border bg-amber-50 border-amber-200"
                    )}>
                      <div className="flex items-center">
                        <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600 mr-2" />
                        <span className="text-sm sm:text-base font-medium text-amber-900">
                          Niet gratis in het (parkeer)vak
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Dedicated spots */}
                  {parkingRules.motorcycleSpecific.dedicatedSpots && 
                   parkingRules.motorcycleSpecific.dedicatedSpots.length > 0 && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4">
                      <h4 className="font-medium text-blue-900 mb-2 flex items-center">
                        <MapPin className="h-4 w-4 mr-1" />
                        Aangewezen motorvakken ({parkingRules.motorcycleSpecific.dedicatedSpots.length})
                      </h4>
                      <div className="space-y-2">
                        {parkingRules.motorcycleSpecific.dedicatedSpots.map((spot, index) => (
                          <div key={index} className="flex justify-between items-center text-sm">
                            <span className="text-blue-800">{spot.location}</span>
                            <span className="bg-blue-200 text-blue-900 px-2 py-1 rounded text-xs">
                              {spot.spots} plaatsen
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Notes */}
                  {parkingRules.motorcycleSpecific.notes && (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 sm:p-4">
                      <p className="text-sm text-gray-700">
                        {parkingRules.motorcycleSpecific.notes}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Paid parking */}
            {parkingRules.paid?.enabled && parkingRules.paid.rates && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <h4 className="font-medium text-amber-900 mb-3 flex items-center">
                  <Clock className="h-4 w-4 mr-2" />
                  Betaald parkeren
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-amber-800">Per uur:</span>
                    <span className="font-medium text-amber-900">€{parkingRules.paid.rates.hourly.toFixed(2)}</span>
                  </div>
                  {parkingRules.paid.rates.daily && (
                    <div className="flex justify-between">
                      <span className="text-amber-800">Per dag:</span>
                      <span className="font-medium text-amber-900">€{parkingRules.paid.rates.daily.toFixed(2)}</span>
                    </div>
                  )}
                </div>
                {parkingRules.paid.areas && parkingRules.paid.areas.length > 0 && (
                  <div className="mt-3">
                    <span className="text-sm font-medium text-amber-800">Gebieden:</span>
                    <p className="text-sm text-amber-700 mt-1">
                      {parkingRules.paid.areas.join(', ')}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Time restrictions */}
            {parkingRules.restrictions?.timeLimit && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <h4 className="font-medium text-orange-900 mb-2 flex items-center">
                  <Clock className="h-4 w-4 mr-2" />
                  Tijdslimiet
                </h4>
                <p className="text-sm text-orange-800">
                  Maximaal {parkingRules.restrictions.timeLimit} uur parkeren
                </p>
              </div>
            )}

            {/* Permits */}
            {parkingRules.permits?.required && (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <h4 className="font-medium text-purple-900 mb-2">
                  Vergunning vereist
                </h4>
                {parkingRules.permits.types.length > 0 ? (
                  <ul className="text-sm text-purple-800 space-y-1">
                    {parkingRules.permits.types.map((type, index) => (
                      <li key={index}>• {type}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-purple-800">
                    Er is een vergunning vereist voor parkeren.
                  </p>
                )}
              </div>
            )}

            {/* No parking zones */}
            {parkingRules.restrictions?.noParking && 
             parkingRules.restrictions.noParking.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h4 className="font-medium text-red-900 mb-2 flex items-center">
                  <X className="h-4 w-4 mr-2" />
                  Parkeerverbod
                </h4>
                <div className="space-y-1">
                  {parkingRules.restrictions.noParking.map((restriction, index) => (
                    <div key={index} className="text-sm text-red-800">
                      <span className="font-medium">{restriction.location}</span>
                      {restriction.days && (
                        <span className="ml-2">({restriction.days.join(', ')})</span>
                      )}
                      {restriction.times && (
                        <span className="ml-2">{restriction.times}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Modern footer */}
        <div className="bg-gray-50 -mx-4 sm:-mx-6 mt-6 px-4 sm:px-6 py-4 border-t border-gray-100">
          <div className="flex flex-col gap-3">
            {/* Last updated */}
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Calendar className="h-3 w-3" />
              <span>{!data.lastUpdated || data.lastUpdated === '' ? 'Nog niet bijgewerkt' : new Date(data.lastUpdated).toLocaleDateString('nl-NL')}</span>
            </div>

            {/* Contact & Sources in a flex row for mobile, stacked for larger screens */}
            <div className="flex flex-col sm:flex-row sm:justify-between gap-2 sm:gap-4">
              {/* Contact */}
              {'contact' in data && data.contact?.email ? (
                data.contact.email && data.contact.email !== '#' ? (
                  <a 
                    href={`mailto:${data.contact.email}`}
                    className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 transition-colors group"
                  >
                    <Mail className="h-3 w-3 group-hover:scale-110 transition-transform" />
                    <span>Contact</span>
                  </a>
                ) : (
                  <span className="flex items-center gap-1.5 text-xs text-gray-400 cursor-not-allowed">
                    <Mail className="h-3 w-3" />
                    <span>Contact</span>
                  </span>
                )
              ) : null}

              {/* Sources */}
              {data.sources && data.sources.length > 0 && (
                <div className="flex items-center gap-2">
                  {data.sources.slice(0, 2).map((source, index) => {
                    const isDisabled = !source.url || source.url === '' || source.url === '#';
                    return isDisabled ? (
                      <span 
                        key={index}
                        className="flex items-center gap-1 text-xs text-gray-400 cursor-not-allowed"
                        title={source.name || source.type}
                      >
                        <ExternalLink className="h-3 w-3" />
                        <span className="hidden sm:inline">{source.name || 'Bron'}</span>
                        <span className="sm:hidden">Bron</span>
                      </span>
                    ) : (
                      <a 
                        key={index}
                        href={source.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 transition-colors group"
                        title={source.name || source.type}
                      >
                        <ExternalLink className="h-3 w-3 group-hover:scale-110 transition-transform" />
                        <span className="hidden sm:inline">{source.name || 'Bron'}</span>
                        <span className="sm:hidden">Bron</span>
                      </a>
                    );
                  })}
                  {data.sources.length > 2 && (
                    <span className="text-xs text-gray-400">
                      +{data.sources.length - 2}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
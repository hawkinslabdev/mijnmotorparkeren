import React from 'react'
import {
  Clock,
  Euro,
  MapPin,
  AlertTriangle,
  Bike,
  X,
  Check,
  ExternalLink,
  Mail,
  Calendar,
  type LucideIcon,
} from 'lucide-react'
import type { Gemeente } from '../../types/gemeente'
import type { City } from '../../types/city'
import type { POI } from '../../types/poi'
import { POI_TYPE_CONFIG } from '../../types/poi'
import { POIDot } from './POIDetails'
import { clsx } from 'clsx'

interface ParkingRulesProps {
  gemeente?: Gemeente | null
  city?: City | null
  className?: string
  onClose?: () => void
  pois?: POI[]
  onPOISelect?: (poi: POI) => void
}

const RULE_TONES = {
  positive: 'text-green-700',
  negative: 'text-red-700',
  caution: 'text-amber-700',
  neutral: 'text-gray-500',
}

// Icon shape and wording carry status
const RuleRow: React.FC<{
  icon: LucideIcon
  tone: keyof typeof RULE_TONES
  title: string
  children?: React.ReactNode
}> = ({ icon: Icon, tone, title, children }) => (
  <li className="flex gap-3 py-3">
    <Icon
      className={clsx('mt-0.5 h-5 w-5 flex-none', RULE_TONES[tone])}
      strokeWidth={2.5}
      aria-hidden="true"
    />
    <div className="min-w-0 grow">
      <p className="text-base font-medium leading-snug text-gray-900">{title}</p>
      {children && <div className="mt-1 text-sm leading-relaxed text-gray-700">{children}</div>}
    </div>
  </li>
)

export const ParkingRules: React.FC<ParkingRulesProps> = ({
  gemeente,
  city,
  className,
  onClose,
  pois = [],
  onPOISelect,
}) => {
  // Use city data if available, otherwise use gemeente data
  const data = city || gemeente
  const isCity = !!city

  if (!data) {
    return (
      <div
        className={clsx(
          'p-4 sm:p-6 bg-white rounded-xl shadow-sm border border-gray-100',
          className
        )}
      >
        <div className="text-center text-gray-500">
          <MapPin className="mx-auto mb-3 h-12 w-12 text-gray-300" />
          <p className="text-sm font-medium">
            Selecteer een gemeente om de parkeerregels te bekijken
          </p>
        </div>
      </div>
    )
  }

  const { parkingRules } = data
  const moto = parkingRules?.motorcycleSpecific
  const paid = parkingRules?.paid
  const restrictions = parkingRules?.restrictions
  const permits = parkingRules?.permits

  const rules = [
    moto?.allowedOnSidewalk === true && (
      <RuleRow key="sidewalk" icon={Check} tone="positive" title="Op de stoep toegestaan" />
    ),
    moto?.allowedOnSidewalk === false && (
      <RuleRow key="sidewalk" icon={X} tone="negative" title="Niet op de stoep" />
    ),
    moto?.freeInPaidZones === true && (
      <RuleRow key="free" icon={Check} tone="positive" title="Gratis in betaalzones" />
    ),
    moto?.freeInPaidZones === false && (
      <RuleRow key="free" icon={AlertTriangle} tone="caution" title="Niet gratis in het vak" />
    ),
    moto?.dedicatedSpots && moto.dedicatedSpots.length > 0 && (
      <RuleRow
        key="spots"
        icon={MapPin}
        tone="neutral"
        title={`Aangewezen motorvakken (${moto.dedicatedSpots.length})`}
      >
        <ul className="space-y-1">
          {moto.dedicatedSpots.map((spot, index) => (
            <li key={index} className="flex justify-between gap-4">
              <span>{spot.location}</span>
              {spot.spots && <span className="flex-none tabular-nums">{spot.spots} plaatsen</span>}
            </li>
          ))}
        </ul>
      </RuleRow>
    ),
    paid?.enabled && paid.rates && (
      <RuleRow key="paid" icon={Euro} tone="caution" title="Betaald parkeren">
        <dl className="space-y-1 tabular-nums">
          <div className="flex justify-between gap-4">
            <dt>Per uur:</dt>
            <dd className="font-medium text-gray-900">€{paid.rates.hourly.toFixed(2)}</dd>
          </div>
          {paid.rates.daily && (
            <div className="flex justify-between gap-4">
              <dt>Per dag:</dt>
              <dd className="font-medium text-gray-900">€{paid.rates.daily.toFixed(2)}</dd>
            </div>
          )}
        </dl>
        {paid.areas && paid.areas.length > 0 && (
          <p className="mt-2">
            <span className="font-medium text-gray-900">Gebieden:</span> {paid.areas.join(', ')}
          </p>
        )}
      </RuleRow>
    ),
    restrictions?.timeLimit && (
      <RuleRow key="limit" icon={Clock} tone="caution" title="Tijdslimiet">
        Maximaal {restrictions.timeLimit} uur parkeren
      </RuleRow>
    ),
    permits?.required && (
      <RuleRow key="permit" icon={AlertTriangle} tone="caution" title="Vergunning vereist">
        {permits.types?.length ? (
          <ul className="list-disc space-y-1 pl-4">
            {permits.types.map((type, index) => (
              <li key={index}>{type}</li>
            ))}
          </ul>
        ) : (
          'Er is een vergunning vereist voor parkeren.'
        )}
      </RuleRow>
    ),
    restrictions?.noParking && restrictions.noParking.length > 0 && (
      <RuleRow key="ban" icon={X} tone="negative" title="Parkeerverbod">
        <div className="space-y-1">
          {restrictions.noParking.map((restriction, index) => (
            <div key={index}>
              <span className="font-medium text-gray-900">{restriction.location}</span>
              {restriction.days && <span className="ml-2">({restriction.days.join(', ')})</span>}
              {restriction.times && <span className="ml-2">{restriction.times}</span>}
            </div>
          ))}
        </div>
      </RuleRow>
    ),
  ].filter(Boolean)

  return (
    <div
      className={clsx(
        'bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden',
        className
      )}
    >
      {/* Header */}
      <div className="flex flex-wrap-reverse items-center gap-x-1 bg-gradient-to-r from-blue-50 to-indigo-50 p-4 sm:p-6">
        {/* Header buttons; wrap above long titles */}
        <div className="ml-auto flex flex-shrink-0 items-center gap-1">
          {/* Report/Help button */}
          <a
            href="https://github.com/hawkinslabdev/mijnmotorparkeren/issues"
            target="_blank"
            rel="noopener noreferrer"
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full hover:bg-white/50 transition-colors group"
            aria-label="Probleem melden"
          >
            <AlertTriangle
              className="h-5 w-5 text-rose-700 group-hover:text-rose-800 transition-colors"
              aria-hidden="true"
            />
          </a>

          {/* Close button */}
          {onClose && (
            <button
              onClick={onClose}
              className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full hover:bg-white/50 transition-colors"
              aria-label="Sluiten"
            >
              <X className="h-5 w-5 text-gray-600" aria-hidden="true" />
            </button>
          )}
        </div>

        <div className="order-first min-w-0 grow basis-48">
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-1 break-words">
            {data.name}
          </h2>

          {/* City indicator if applicable */}
          {isCity && city && (
            <p className="text-sm text-gray-600">
              in Gemeente {city.parent.charAt(0).toUpperCase() + city.parent.slice(1)}
            </p>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
        {!parkingRules && (
          <p className="text-sm text-gray-600">
            Er zijn geen gegevens over parkeerregels beschikbaar voor deze gemeente.
          </p>
        )}

        {(rules.length > 0 || moto?.notes) && (
          <div>
            <h3 className="mb-1 flex items-center text-base font-semibold text-gray-900 sm:text-lg">
              <Bike className="mr-2 h-5 w-5" aria-hidden="true" />
              Parkeren
            </h3>

            {rules.length > 0 && <ul className="divide-y divide-gray-100 break-words">{rules}</ul>}

            {moto?.notes && (
              <p className="mt-3 whitespace-pre-line break-words text-sm leading-relaxed text-gray-700">
                {moto.notes}
              </p>
            )}
          </div>
        )}

        {/* Keyboard route to map POIs */}
        {pois.length > 0 && onPOISelect && (
          <div className="space-y-2">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900">
              Parkeerlocaties ({pois.length})
            </h3>
            <ul className="divide-y divide-gray-200 rounded-lg border border-gray-200">
              {pois.map((poi) => (
                <li key={poi.id}>
                  <button
                    type="button"
                    onClick={() => onPOISelect(poi)}
                    className="flex w-full min-h-11 items-center gap-3 px-3 py-2 text-left hover:bg-gray-50 transition-colors"
                  >
                    <POIDot type={poi.type} className="w-3 h-3" />
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-gray-900">{poi.name}</span>
                      <span className="block text-xs text-gray-600">
                        {POI_TYPE_CONFIG[poi.type].label}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Modern footer */}
        <div className="bg-gray-50 -mx-4 sm:-mx-6 mt-6 px-4 sm:px-6 py-4 border-t border-gray-100">
          <div className="flex flex-col gap-3">
            {/* Last updated */}
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Calendar className="h-3 w-3" />
              <span>
                {!data.lastUpdated || data.lastUpdated === ''
                  ? 'Nog niet bijgewerkt'
                  : new Date(data.lastUpdated).toLocaleDateString('nl-NL')}
              </span>
            </div>

            {/* Contact & Sources in a flex row for mobile, stacked for larger screens */}
            <div className="flex flex-col sm:flex-row sm:justify-between gap-2 sm:gap-4">
              {/* Contact */}
              {'contact' in data && data.contact?.email ? (
                data.contact.email && data.contact.email !== '#' ? (
                  <a
                    href={`mailto:${data.contact.email}`}
                    className="flex items-center gap-1.5 min-h-11 text-xs text-blue-700 hover:text-blue-800 transition-colors group"
                  >
                    <Mail className="h-3 w-3 group-hover:scale-110 transition-transform" />
                    <span>Contact</span>
                  </a>
                ) : (
                  <span className="flex items-center gap-1.5 text-xs text-gray-600 cursor-not-allowed">
                    <Mail className="h-3 w-3" />
                    <span>Contact</span>
                  </span>
                )
              ) : null}

              {/* Sources */}
              {data.sources && data.sources.length > 0 && (
                <div className="flex items-center gap-2">
                  {data.sources.slice(0, 2).map((source, index) => {
                    const isDisabled = !source.url
                    return isDisabled ? (
                      <span
                        key={index}
                        className="flex items-center gap-1 text-xs text-gray-600 cursor-not-allowed py-2"
                        title={source.name || source.type}
                      >
                        <ExternalLink className="h-3 w-3" aria-hidden="true" />
                        <span className="hidden sm:inline">{source.name || 'Bron'}</span>
                        <span className="sm:hidden">Bron</span>
                      </span>
                    ) : (
                      <a
                        key={index}
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 min-h-11 min-w-11 text-xs text-blue-700 hover:text-blue-800 transition-colors group"
                        title={source.name || source.type}
                        aria-label={source.name || 'Bekijk bron'}
                      >
                        <ExternalLink
                          className="h-3 w-3 group-hover:scale-110 transition-transform"
                          aria-hidden="true"
                        />
                        <span className="hidden sm:inline">{source.name || 'Bron'}</span>
                        <span className="sm:hidden">Bron</span>
                      </a>
                    )
                  })}
                  {data.sources.length > 2 && (
                    <span className="text-xs text-gray-600">+{data.sources.length - 2}</span>
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

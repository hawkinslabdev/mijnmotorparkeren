import React, { useEffect, useRef, useState } from 'react'
import {
  Clock,
  Euro,
  MapPin,
  AlertTriangle,
  Flag,
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
  placeName?: string
}

const RULE_TONES = {
  positive: 'text-green-800',
  negative: 'text-red-800',
  caution: 'text-amber-800',
  neutral: 'text-gray-900',
}

// Icon shape and wording carry status
const RuleRow: React.FC<{
  icon: LucideIcon
  tone: keyof typeof RULE_TONES
  title: string
  children?: React.ReactNode
}> = ({ icon: Icon, tone, title, children }) => (
  <li className="flex gap-3">
    <Icon
      className={clsx('h-6 w-6 flex-none', RULE_TONES[tone])}
      strokeWidth={2.5}
      aria-hidden="true"
    />
    <div className="min-w-0 grow">
      <p className={clsx('text-lg font-semibold leading-6', RULE_TONES[tone])}>{title}</p>
      {children && <div className="mt-1 text-sm leading-relaxed text-gray-700">{children}</div>}
    </div>
  </li>
)

// Hover on desktop, tap on touch
const SourceName: React.FC<{ name: string }> = ({ name }) => {
  const [open, setOpen] = useState(false)
  const textRef = useRef<HTMLSpanElement>(null)
  const pointerType = useRef('')
  const label = `Bron: ${name}`
  const isCut = () => {
    const el = textRef.current
    return !!el && el.scrollWidth > el.clientWidth
  }

  useEffect(() => {
    if (!open) return
    const close = () => setOpen(false)
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [open])

  return (
    <div className="relative">
      <button
        type="button"
        className="flex min-h-11 w-full items-center text-left"
        onPointerDown={(e) => {
          e.stopPropagation()
          pointerType.current = e.pointerType
        }}
        onClick={() => {
          // Hover already handles the mouse
          if (pointerType.current !== 'mouse') setOpen((value) => !value && isCut())
          pointerType.current = ''
        }}
        onPointerEnter={(e) => {
          if (e.pointerType === 'mouse' && isCut()) setOpen(true)
        }}
        onPointerLeave={(e) => {
          if (e.pointerType === 'mouse') setOpen(false)
        }}
        onFocus={(e) => {
          if (e.target.matches(':focus-visible')) setOpen(isCut())
        }}
        onBlur={() => setOpen(false)}
        onKeyDown={(e) => {
          if (e.key === 'Escape' && open) {
            e.stopPropagation()
            setOpen(false)
          }
        }}
      >
        <span ref={textRef} className="block min-w-0 truncate">
          {label}
        </span>
      </button>
      {open && (
        <div
          aria-hidden="true"
          className="absolute bottom-full left-0 z-10 mb-1 max-w-full rounded-lg bg-gray-900 px-3 py-2 text-sm text-white shadow-lg"
        >
          {label}
        </div>
      )}
    </div>
  )
}

export const ParkingRules: React.FC<ParkingRulesProps> = ({
  gemeente,
  city,
  className,
  onClose,
  pois = [],
  onPOISelect,
  placeName,
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

  const shownSources = data.sources?.slice(0, 2) ?? []
  const linkedSources = shownSources.filter((source) => source.url)
  const namedSources = shownSources.filter((source) => !source.url && source.name)
  const hiddenSourceCount = (data.sources?.length ?? 0) - shownSources.length

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
    paid?.enabled && (
      <RuleRow key="paid" icon={Euro} tone="caution" title="Betaald parkeren">
        {(paid.rates || paid.areas?.length) && (
          <>
            {paid.rates && (
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
            )}
            {paid.areas && paid.areas.length > 0 && (
              <p className={clsx(paid.rates && 'mt-2')}>
                <span className="font-medium text-gray-900">Gebieden:</span> {paid.areas.join(', ')}
              </p>
            )}
          </>
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
    <div className={className}>
      {/* Header */}
      <div className="flex flex-wrap-reverse items-center gap-x-1">
        {/* Header buttons; wrap above long titles */}
        <div className="ml-auto flex flex-shrink-0 items-center gap-1">
          {/* Close button */}
          {onClose && (
            <button
              onClick={onClose}
              className="-mr-3 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
              aria-label="Sluiten"
            >
              <X className="h-5 w-5 text-gray-600" aria-hidden="true" />
            </button>
          )}
        </div>

        <div className="order-first min-w-0 grow basis-48">
          <h2 className="text-xl font-bold text-gray-900 break-words">{data.name}</h2>

          {placeName && <p className="text-sm text-gray-600">Geldt ook voor {placeName}</p>}

          {/* City indicator if applicable */}
          {isCity && city && (
            <p className="text-sm text-gray-600">
              in Gemeente {city.parent.charAt(0).toUpperCase() + city.parent.slice(1)}
            </p>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="mt-3 space-y-5">
        {!parkingRules && (
          <p className="text-sm text-gray-600">
            Er zijn geen gegevens over parkeerregels beschikbaar voor deze gemeente.
          </p>
        )}

        {rules.length > 0 && <ul className="space-y-3 break-words">{rules}</ul>}

        {moto?.notes && (
          <p className="whitespace-pre-line break-words border-t border-gray-200 pt-4 text-base leading-relaxed text-gray-800">
            {moto.notes}
          </p>
        )}

        {/* Keyboard route to map POIs */}
        {pois.length > 0 && onPOISelect && (
          <div className="space-y-2">
            <h3 className="text-base font-semibold text-gray-900">
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
                      <span className="block text-base font-medium text-gray-900">{poi.name}</span>
                      <span className="block text-sm text-gray-600">
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
        <div className="border-t border-gray-200 pt-2">
          <div className="flex flex-wrap items-start justify-between gap-x-4">
            {/* Omitted when unknown */}
            {(data.lastUpdated || namedSources.length > 0) && (
              <div className="min-w-0 grow basis-40 text-sm text-gray-600">
                {data.lastUpdated && (
                  <div className="flex min-h-11 items-center gap-2">
                    <Calendar className="h-3.5 w-3.5 flex-none" aria-hidden="true" />
                    <span>{new Date(data.lastUpdated).toLocaleDateString('nl-NL')}</span>
                  </div>
                )}
                {namedSources.map((source, index) => (
                  <SourceName key={index} name={source.name as string} />
                ))}
              </div>
            )}

            {/* Contact & Sources in a flex row for mobile, stacked for larger screens */}
            <div className="ml-auto flex flex-shrink-0 items-center gap-4">
              {/* Contact */}
              {'contact' in data && data.contact?.email ? (
                data.contact.email && data.contact.email !== '#' ? (
                  <a
                    href={`mailto:${data.contact.email}`}
                    className="flex items-center gap-1.5 min-h-11 text-sm text-blue-700 hover:text-blue-800 transition-colors group"
                  >
                    <Mail
                      className="h-3.5 w-3.5 flex-none group-hover:scale-110 transition-transform"
                      aria-hidden="true"
                    />
                    <span>Contact</span>
                  </a>
                ) : (
                  <span className="flex items-center gap-1.5 text-sm text-gray-600 cursor-not-allowed">
                    <Mail className="h-3.5 w-3.5 flex-none" aria-hidden="true" />
                    <span>Contact</span>
                  </span>
                )
              ) : null}

              {/* Linked sources */}
              {linkedSources.map((source, index) => (
                <a
                  key={index}
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 min-h-11 min-w-11 text-sm text-blue-700 hover:text-blue-800 transition-colors group"
                  title={source.name || source.type}
                  aria-label={source.name ? `Bron: ${source.name}` : 'Bron'}
                >
                  <ExternalLink
                    className="h-3.5 w-3.5 flex-none group-hover:scale-110 transition-transform"
                    aria-hidden="true"
                  />
                  <span>Bron</span>
                </a>
              ))}
              {hiddenSourceCount > 0 && (
                <span className="text-sm text-gray-600">+{hiddenSourceCount}</span>
              )}

              {/* Report sits with the source */}
              <a
                href="https://github.com/hawkinslabdev/mijnmotorparkeren/issues"
                target="_blank"
                rel="noopener noreferrer"
                title="Probleem melden"
                aria-label="Probleem melden"
                className="-mr-3 flex min-h-11 min-w-11 items-center justify-center rounded-full text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
              >
                <Flag className="h-5 w-5" aria-hidden="true" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

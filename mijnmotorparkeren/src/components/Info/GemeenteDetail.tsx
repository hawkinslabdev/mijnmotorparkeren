// src/components/GemeenteDetail.tsx
import React from 'react'
import { Gemeente } from '@/types/gemeente'
import {
  getParkingStatus,
  hasDedicatedMotorcycleSpots,
  getMotorcycleInfo,
  isValidGemeente
} from '@/utils/gemeenteUtils'

interface GemeenteDetailProps {
  gemeente: Gemeente | null
  // ... other props
}

export const GemeenteDetail: React.FC<GemeenteDetailProps> = ({ gemeente }) => {
  if (!gemeente || !isValidGemeente(gemeente)) {
    return <div>Invalid gemeente data</div>
  }

  const parkingStatus = getParkingStatus(gemeente)
  const motorcycleInfo = getMotorcycleInfo(gemeente)

  return (
    <div>
      <h1>{gemeente.name}</h1>
      <div className={`status ${parkingStatus.colorClass}`}>
        {parkingStatus.label}
      </div>
      {hasDedicatedMotorcycleSpots(gemeente) && (
        <div>
          <h2>Motorcycle Parking</h2>
          <p>Dedicated Spots: {motorcycleInfo.dedicatedSpots}</p>
          <p>Allowed on Sidewalk: {motorcycleInfo.allowedOnSidewalk ? 'Yes' : 'No'}</p>
          <p>Free in Paid Zones: {motorcycleInfo.freeInPaidZones ? 'Yes' : 'No'}</p>
          <p>Notes: {motorcycleInfo.notes}</p>
        </div>
      )}
      <div>
        <h2>Parking Rules</h2>
        <pre>{JSON.stringify(gemeente.parkingRules, null, 2)}</pre>
      </div>
    </div>
  )
}
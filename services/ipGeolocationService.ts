
import { FirewallLog, GeolocatedThreat } from '../types';
import { IP_GEOLOCATIONS } from '../constants';

export const getGeolocationsForLogs = async (logs: FirewallLog[]): Promise<GeolocatedThreat[]> => {
  const geolocatedThreats: GeolocatedThreat[] = [];

  for (const log of logs) {
    // Only map logs that were blocked and have a known location
    if (log.action === 'BLOCKED' && IP_GEOLOCATIONS[log.sourceIp]) {
      const location = IP_GEOLOCATIONS[log.sourceIp];
      geolocatedThreats.push({
        ...log,
        ...location,
      });
    }
  }

  // Simulate a small network delay for fetching data
  await new Promise(resolve => setTimeout(resolve, 50));
  
  return geolocatedThreats;
};
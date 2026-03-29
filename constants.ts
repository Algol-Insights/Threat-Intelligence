import { FirewallLog } from './types';

export const MOCK_LOGS: FirewallLog[] = [];

export const IP_GEOLOCATIONS: Record<string, { lat: number; lng: number; city: string; }> = {
  '198.51.100.54': { lat: 34.0522, lng: -118.2437, city: 'Los Angeles, USA' },
  '192.0.2.14': { lat: 52.3676, lng: 4.9041, city: 'Amsterdam, NL' },
  '198.51.100.89': { lat: 51.5074, lng: -0.1278, city: 'London, UK' },
  '192.0.2.77': { lat: 35.6895, lng: 139.6917, city: 'Tokyo, JP' },
  '198.51.100.112': { lat: 40.7128, lng: -74.0060, city: 'New York, USA' },
  '192.0.2.199': { lat: -33.8688, lng: 151.2093, city: 'Sydney, AU' },
  '198.51.100.201': { lat: 48.8566, lng: 2.3522, city: 'Paris, FR' },
  '203.0.113.88': { lat: 55.7558, lng: 37.6173, city: 'Moscow, RU' },
  '192.0.2.210': { lat: 39.9042, lng: 116.4074, city: 'Beijing, CN' },
  '203.0.113.42': { lat: 28.6139, lng: 77.2090, city: 'New Delhi, IN' },
  '203.0.113.111': {lat: 4.86, lng: -1.88, city: 'Axim, GH'}
};

export const INDUSTRIES = ['Finance', 'Healthcare', 'Government', 'Retail', 'Technology', 'Energy', 'Education'];
export const COUNTRIES = ['USA', 'United Kingdom', 'Germany', 'Japan', 'Australia', 'Canada', 'Singapore'];

export const TRAINING_SCENARIO = {
    title: "The Suspicious Data Exfiltration",
    description: "An analyst observes a series of alerts over a 30-minute window. First, a high-volume of DNS queries to a non-standard domain are blocked. Minutes later, a successful TCP connection on port 53 is made to the same IP address resolved from the DNS queries. Finally, a large outbound data transfer is blocked from an internal database server to this external IP.",
    expertAnalysis: "This pattern is highly indicative of DNS Tunneling. The attacker uses DNS queries not for resolution, but to encode and exfiltrate data, bypassing standard firewall rules that might block large outbound transfers on typical HTTP/FTP ports. The successful TCP connection on port 53 (typically UDP for DNS queries) was likely the command-and-control channel. The firewall correctly blocked the final, large data transfer. This is likely a sophisticated attacker attempting data theft."
};
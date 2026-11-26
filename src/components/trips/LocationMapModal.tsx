import React, { useState, useEffect, useRef } from 'react'
import { Modal } from '../ui/Modal'
import { MapPin, Search, ExternalLink, Check, Clock, X, Loader2 } from 'lucide-react'

interface LocationMapModalProps {
  isOpen: boolean
  onClose: () => void
  onSelectLocation: (address: string, lat?: number, lng?: number) => void
  title?: string
  initialAddress?: string
}

export interface LocationSuggestion {
  id: string
  name: string
  subtitle: string
  address: string
  lat: number
  lng: number
  isRecentOrPopular?: boolean
}

/**
 * Curated high-accuracy localities, tech parks, suburbs, metro hubs,
 * and district headquarters for Karnataka and Bengaluru.
 * Provides 0ms instant matching before the online geocoder even responds!
 */
const KNOWN_LOCALITIES: LocationSuggestion[] = [
  // ==================== "CHIK*" LOCALITIES ====================
  {
    id: 'chik-chikkabanavara',
    name: 'Chikkabanavara',
    subtitle: 'Bengaluru North, Karnataka',
    address: 'Chikkabanavara, Bengaluru North, Karnataka 560090',
    lat: 13.0827,
    lng: 77.5098,
    isRecentOrPopular: true,
  },
  {
    id: 'chik-chikpet',
    name: 'Chikpete',
    subtitle: 'Central Bengaluru, Karnataka',
    address: 'Chikpet, Chickpet Metro Station area, Bengaluru, Karnataka 560053',
    lat: 12.9698,
    lng: 77.5760,
  },
  {
    id: 'chik-chikkaballapur',
    name: 'Chikkaballapur',
    subtitle: 'Karnataka',
    address: 'Chikkaballapur Town, Chikkaballapur District, Karnataka 562101',
    lat: 13.4355,
    lng: 77.7275,
  },
  {
    id: 'chik-chikka-tirupathi',
    name: 'Chikka Tirupathi',
    subtitle: 'Bengaluru Rural, Karnataka',
    address: 'Chikka Tirupathi, Malur-Hosur Road, Bengaluru Rural, Karnataka 563160',
    lat: 12.8943,
    lng: 77.8540,
  },
  {
    id: 'chik-chikkagubbi',
    name: 'Chikkagubbi',
    subtitle: 'Bengaluru North, Karnataka',
    address: 'Chikkagubbi, Hennur Bagalur Main Road, Bengaluru, Karnataka 560077',
    lat: 13.0768,
    lng: 77.6698,
  },
  {
    id: 'chik-chikkalasandra',
    name: 'Chikkalasandra',
    subtitle: 'Bengaluru South, Karnataka',
    address: 'Chikkalasandra, Uttarahalli Hobli, Bengaluru South, Karnataka 560061',
    lat: 12.9128,
    lng: 77.5458,
  },
  {
    id: 'chik-chikmagalur',
    name: 'Chikmagalur (Chikkamagaluru)',
    subtitle: 'Chikkamagaluru District, Karnataka',
    address: 'Chikkamagaluru City, Chikmagalur District, Karnataka 577101',
    lat: 13.3161,
    lng: 75.7720,
  },
  {
    id: 'chik-chikkajala',
    name: 'Chikkajala',
    subtitle: 'Airport Road, Bengaluru, Karnataka',
    address: 'Chikkajala, Airport Road, Bengaluru North, Karnataka 562157',
    lat: 13.1678,
    lng: 77.6293,
  },
  {
    id: 'chik-chikka-bidarakallu',
    name: 'Chikka Bidarakallu',
    subtitle: 'Tumkur Road, Bengaluru, Karnataka',
    address: 'Chikka Bidarakallu, Tumkur Road, Dasanapura, Bengaluru, Karnataka 560073',
    lat: 13.0645,
    lng: 77.4891,
  },
  {
    id: 'chik-chikkakannalli',
    name: 'Chikkakannalli',
    subtitle: 'Sarjapur Road, Bengaluru, Karnataka',
    address: 'Chikkakannalli, Sarjapur Main Road, Bengaluru, Karnataka 560035',
    lat: 12.9056,
    lng: 77.6974,
  },
  {
    id: 'chik-chikkabettahalli',
    name: 'Chikkabettahalli',
    subtitle: 'Vidyaranyapura, Bengaluru, Karnataka',
    address: 'Chikkabettahalli, Vidyaranyapura, Bengaluru North, Karnataka 560097',
    lat: 13.0850,
    lng: 77.5610,
  },
  {
    id: 'chik-chikkathogur',
    name: 'Chikkathogur',
    subtitle: 'Electronic City, Bengaluru, Karnataka',
    address: 'Chikkathogur, Electronic City Phase 1, Bengaluru, Karnataka 560100',
    lat: 12.8468,
    lng: 77.6710,
  },
  {
    id: 'chik-chikka-begur',
    name: 'Chikka Begur',
    subtitle: 'Kudlu Gate, Bengaluru, Karnataka',
    address: 'Chikka Begur, Kudlu Gate, Hosur Road, Bengaluru, Karnataka 560068',
    lat: 12.8870,
    lng: 77.6380,
  },
  {
    id: 'chik-chikkabidarakallu-metro',
    name: 'Chikkabidarakallu Metro',
    subtitle: 'Green Line, Bengaluru, Karnataka',
    address: 'Chikkabidarakallu Metro Station, Green Line, Bengaluru, Karnataka 560073',
    lat: 13.0552,
    lng: 77.4952,
  },

  // ==================== "DAN*" LOCALITIES ====================
  {
    id: 'dan-dandeli',
    name: 'Dandeli',
    subtitle: 'Uttara Kannada, Karnataka',
    address: 'Dandeli City, Haliyal Taluk, Uttara Kannada, Karnataka 581325',
    lat: 15.2415,
    lng: 74.6186,
    isRecentOrPopular: true,
  },
  {
    id: 'dan-dandupalya',
    name: 'Dandupalya',
    subtitle: 'Hoskote, Bengaluru Rural, Karnataka',
    address: 'Dandupalya, Hoskote Main Road, Bengaluru Rural, Karnataka 562114',
    lat: 13.0632,
    lng: 77.7884,
  },
  {
    id: 'dan-dasanapura',
    name: 'Dasanapura',
    subtitle: 'Tumkur Road, Bengaluru North, Karnataka',
    address: 'Dasanapura Hobli, Tumkur Road, Bengaluru North, Karnataka 562123',
    lat: 13.0844,
    lng: 77.4471,
  },
  {
    id: 'dan-dandiganahalli',
    name: 'Dandiganahalli',
    subtitle: 'Chikkaballapur, Karnataka',
    address: 'Dandiganahalli, Chikkaballapur District, Karnataka 561208',
    lat: 13.5120,
    lng: 77.8100,
  },
  {
    id: 'dan-davanagere',
    name: 'Davanagere',
    subtitle: 'Davanagere District, Karnataka',
    address: 'Davanagere City, Davanagere District, Karnataka 577002',
    lat: 14.4644,
    lng: 75.9218,
  },

  // ==================== BENGALURU SOUTH & TECH CORRIDORS ====================
  {
    id: 'blr-koramangala-4',
    name: 'Koramangala 4th Block',
    subtitle: 'Bengaluru, Karnataka',
    address: '80 Feet Rd, 4th Block, Koramangala, Bengaluru, 560034',
    lat: 12.9352,
    lng: 77.6245,
    isRecentOrPopular: true,
  },
  {
    id: 'blr-koramangala-5',
    name: 'Koramangala 5th Block',
    subtitle: 'Bengaluru, Karnataka',
    address: 'Jyoti Nivas College Rd, 5th Block, Koramangala, Bengaluru, 560095',
    lat: 12.9345,
    lng: 77.6185,
  },
  {
    id: 'blr-koramangala-1',
    name: 'Koramangala 1st Block',
    subtitle: 'Bengaluru, Karnataka',
    address: '1st Block, Koramangala, Bengaluru, Karnataka 560034',
    lat: 12.9279,
    lng: 77.6322,
  },
  {
    id: 'blr-hsr-1',
    name: 'HSR Layout Sector 1',
    subtitle: 'Bengaluru, Karnataka',
    address: '27th Main Rd, Sector 1, HSR Layout, Bengaluru, 560102',
    lat: 12.9121,
    lng: 77.6446,
    isRecentOrPopular: true,
  },
  {
    id: 'blr-hsr-2',
    name: 'HSR Layout Sector 2',
    subtitle: 'Bengaluru, Karnataka',
    address: 'Sector 2, HSR Layout, Bengaluru, Karnataka 560102',
    lat: 12.9080,
    lng: 77.6480,
  },
  {
    id: 'blr-hsr-3',
    name: 'HSR Layout Sector 3',
    subtitle: 'Bengaluru, Karnataka',
    address: 'Sector 3, HSR Layout, Bengaluru, Karnataka 560102',
    lat: 12.9140,
    lng: 77.6380,
  },
  {
    id: 'blr-btm-2',
    name: 'BTM Layout 2nd Stage',
    subtitle: 'Bengaluru, Karnataka',
    address: 'Outer Ring Road, BTM 2nd Stage, Bengaluru, Karnataka 560076',
    lat: 12.9165,
    lng: 77.6101,
    isRecentOrPopular: true,
  },
  {
    id: 'blr-btm-1',
    name: 'BTM Layout 1st Stage',
    subtitle: 'Bengaluru, Karnataka',
    address: 'BTM 1st Stage, Bengaluru, Karnataka 560029',
    lat: 12.9240,
    lng: 77.6140,
  },
  {
    id: 'blr-jayanagar-4',
    name: 'Jayanagar 4th Block',
    subtitle: 'Bengaluru, Karnataka',
    address: 'Jayanagar 4th Block Shopping Complex, Bengaluru, Karnataka 560011',
    lat: 12.9298,
    lng: 77.5828,
    isRecentOrPopular: true,
  },
  {
    id: 'blr-jayanagar-9',
    name: 'Jayanagar 9th Block',
    subtitle: 'Bengaluru, Karnataka',
    address: 'Jayanagar 9th Block, Bengaluru, Karnataka 560069',
    lat: 12.9190,
    lng: 77.5920,
  },
  {
    id: 'blr-jp-nagar-6',
    name: 'JP Nagar 6th Phase',
    subtitle: 'Bengaluru, Karnataka',
    address: 'Ring Road, JP Nagar 6th Phase, Bengaluru, Karnataka 560078',
    lat: 12.9063,
    lng: 77.5855,
    isRecentOrPopular: true,
  },
  {
    id: 'blr-jp-nagar-7',
    name: 'JP Nagar 7th Phase',
    subtitle: 'Bengaluru, Karnataka',
    address: 'Brigade Millennium Rd, JP Nagar 7th Phase, Bengaluru, Karnataka 560078',
    lat: 12.8950,
    lng: 77.5810,
  },
  {
    id: 'blr-banashankari-2',
    name: 'Banashankari 2nd Stage',
    subtitle: 'Bengaluru, Karnataka',
    address: 'Banashankari 2nd Stage, Bengaluru, Karnataka 560070',
    lat: 12.9250,
    lng: 77.5600,
  },
  {
    id: 'blr-banashankari-3',
    name: 'Banashankari 3rd Stage',
    subtitle: 'Bengaluru, Karnataka',
    address: 'Banashankari 3rd Stage, Bengaluru, Karnataka 560085',
    lat: 12.9220,
    lng: 77.5480,
  },
  {
    id: 'blr-ecity-1',
    name: 'Electronic City Phase 1',
    subtitle: 'Hosur Road, Bengaluru, Karnataka',
    address: 'Hosur Rd, Electronic City Phase 1, Bengaluru, 560100',
    lat: 12.8452,
    lng: 77.6602,
    isRecentOrPopular: true,
  },
  {
    id: 'blr-ecity-2',
    name: 'Electronic City Phase 2',
    subtitle: 'Hosur Road, Bengaluru, Karnataka',
    address: 'Electronic City Phase 2, Hosur Road, Bengaluru, 560100',
    lat: 12.8488,
    lng: 77.6830,
  },
  {
    id: 'blr-bellandur-ecospace',
    name: 'Bellandur EcoSpace',
    subtitle: 'Outer Ring Road, Bengaluru',
    address: 'Outer Ring Rd, RMZ EcoSpace, Bellandur, Bengaluru, 560103',
    lat: 12.9260,
    lng: 77.6833,
    isRecentOrPopular: true,
  },
  {
    id: 'blr-bellandur-central',
    name: 'Bellandur Central',
    subtitle: 'Bengaluru, Karnataka',
    address: 'Bellandur Main Road, Bengaluru, Karnataka 560103',
    lat: 12.9304,
    lng: 77.6784,
  },
  {
    id: 'blr-sarjapur-road',
    name: 'Sarjapur Road',
    subtitle: 'Bengaluru, Karnataka',
    address: 'Sarjapur Main Road, Carmelaram, Bengaluru, Karnataka 560035',
    lat: 12.9100,
    lng: 77.6850,
  },
  {
    id: 'blr-sarjapur-town',
    name: 'Sarjapur Town',
    subtitle: 'Anekal, Bengaluru, Karnataka',
    address: 'Sarjapur Town, Anekal Taluk, Karnataka 562125',
    lat: 12.8600,
    lng: 77.7900,
  },
  {
    id: 'blr-silk-board',
    name: 'Central Silk Board',
    subtitle: 'Hosur Road, Bengaluru, Karnataka',
    address: 'Central Silk Board Junction, Hosur Road, BTM Layout, Bengaluru, Karnataka 560068',
    lat: 12.9172,
    lng: 77.6228,
  },

  // ==================== BENGALURU EAST & WHITEFIELD ====================
  {
    id: 'blr-indiranagar-100ft',
    name: 'Indiranagar 100ft Rd',
    subtitle: 'Bengaluru, Karnataka',
    address: '100 Feet Rd, HAL 2nd Stage, Indiranagar, Bengaluru, 560038',
    lat: 12.9784,
    lng: 77.6408,
    isRecentOrPopular: true,
  },
  {
    id: 'blr-indiranagar-12th',
    name: 'Indiranagar 12th Main',
    subtitle: 'Bengaluru, Karnataka',
    address: '12th Main Road, HAL 2nd Stage, Indiranagar, Bengaluru, 560038',
    lat: 12.9719,
    lng: 77.6412,
  },
  {
    id: 'blr-whitefield-itpl',
    name: 'Whitefield ITPL',
    subtitle: 'Bengaluru, Karnataka',
    address: 'International Tech Park (ITPL), Whitefield Main Rd, Bengaluru, 560066',
    lat: 12.9863,
    lng: 77.7383,
    isRecentOrPopular: true,
  },
  {
    id: 'blr-whitefield-hope-farm',
    name: 'Hope Farm Whitefield',
    subtitle: 'Bengaluru, Karnataka',
    address: 'Hope Farm Junction, Whitefield, Bengaluru, Karnataka 560066',
    lat: 12.9839,
    lng: 77.7516,
  },
  {
    id: 'blr-marathahalli-bridge',
    name: 'Marathahalli Bridge',
    subtitle: 'Outer Ring Road, Bengaluru',
    address: 'Marathahalli Bridge, Outer Ring Road, Bengaluru, Karnataka 560037',
    lat: 12.9591,
    lng: 77.6974,
    isRecentOrPopular: true,
  },
  {
    id: 'blr-mahadevapura',
    name: 'Mahadevapura',
    subtitle: 'Outer Ring Road, Bengaluru',
    address: 'Outer Ring Road, Mahadevapura, Bengaluru, Karnataka 560048',
    lat: 12.9890,
    lng: 77.6890,
  },
  {
    id: 'blr-kr-puram',
    name: 'KR Puram (K.R. Puram)',
    subtitle: 'Old Madras Road, Bengaluru',
    address: 'K.R. Puram Hanging Bridge, Old Madras Road, Bengaluru, Karnataka 560036',
    lat: 13.0039,
    lng: 77.6966,
  },
  {
    id: 'blr-hoodi',
    name: 'Hoodi Junction',
    subtitle: 'Whitefield, Bengaluru',
    address: 'Hoodi Circle, Whitefield Main Road, Bengaluru, Karnataka 560048',
    lat: 12.9922,
    lng: 77.7161,
  },
  {
    id: 'blr-varthur',
    name: 'Varthur',
    subtitle: 'Bengaluru, Karnataka',
    address: 'Varthur Main Road, Bengaluru, Karnataka 560087',
    lat: 12.9380,
    lng: 77.7470,
  },
  {
    id: 'blr-cv-raman-nagar',
    name: 'CV Raman Nagar',
    subtitle: 'Bengaluru, Karnataka',
    address: 'Bagmane Tech Park, CV Raman Nagar, Bengaluru, Karnataka 560093',
    lat: 12.9840,
    lng: 77.6620,
  },
  {
    id: 'blr-domlur',
    name: 'Domlur',
    subtitle: 'Intermediate Ring Road, Bengaluru',
    address: 'Domlur Flyover, Inner Ring Road, Bengaluru, Karnataka 560071',
    lat: 12.9610,
    lng: 77.6380,
  },

  // ==================== BENGALURU NORTH & AIRPORT ====================
  {
    id: 'blr-manyata',
    name: 'Manyata Tech Park',
    subtitle: 'Nagavara, Hebbal, Bengaluru',
    address: 'Manyata Tech Park, Nagavara, Outer Ring Road, Bengaluru, 560045',
    lat: 13.0475,
    lng: 77.6202,
    isRecentOrPopular: true,
  },
  {
    id: 'blr-hebbal-flyover',
    name: 'Hebbal Flyover',
    subtitle: 'Bellary Road, Bengaluru',
    address: 'Hebbal Flyover, Bellary Rd, Outer Ring Road, Bengaluru, 560024',
    lat: 13.0358,
    lng: 77.5970,
    isRecentOrPopular: true,
  },
  {
    id: 'blr-yelahanka-new-town',
    name: 'Yelahanka New Town',
    subtitle: 'Bengaluru North, Karnataka',
    address: 'Yelahanka New Town, Bengaluru North, Karnataka 560064',
    lat: 13.0998,
    lng: 77.5963,
  },
  {
    id: 'blr-yelahanka-old-town',
    name: 'Yelahanka Old Town',
    subtitle: 'Bengaluru North, Karnataka',
    address: 'Yelahanka Old Town, Bengaluru North, Karnataka 560064',
    lat: 13.1006,
    lng: 77.5960,
  },
  {
    id: 'blr-airport-t1',
    name: 'Kempegowda Airport Terminal 1',
    subtitle: 'Devanahalli, Bengaluru',
    address: 'Terminal 1, Kempegowda International Airport (BLR), Devanahalli, Bengaluru, Karnataka 560300',
    lat: 13.1989,
    lng: 77.7068,
    isRecentOrPopular: true,
  },
  {
    id: 'blr-airport-t2',
    name: 'Kempegowda Airport Terminal 2',
    subtitle: 'Devanahalli, Bengaluru',
    address: 'Terminal 2, Kempegowda International Airport (BLR), Devanahalli, Bengaluru, Karnataka 560300',
    lat: 13.2045,
    lng: 77.7120,
    isRecentOrPopular: true,
  },
  {
    id: 'blr-devanahalli',
    name: 'Devanahalli Town',
    subtitle: 'Bengaluru Rural, Karnataka',
    address: 'Devanahalli Town, Bengaluru Rural, Karnataka 562110',
    lat: 13.2483,
    lng: 77.7129,
  },
  {
    id: 'blr-sahakar-nagar',
    name: 'Sahakar Nagar',
    subtitle: 'Bengaluru North, Karnataka',
    address: 'Sahakar Nagar, Byatarayanapura, Bengaluru, Karnataka 560092',
    lat: 13.0620,
    lng: 77.5910,
  },
  {
    id: 'blr-rt-nagar',
    name: 'RT Nagar',
    subtitle: 'Bengaluru, Karnataka',
    address: 'RT Nagar Post Office, 80 Feet Road, Bengaluru, Karnataka 560032',
    lat: 13.0240,
    lng: 77.5940,
  },
  {
    id: 'blr-sanjaynagar',
    name: 'Sanjay Nagar',
    subtitle: 'Bengaluru, Karnataka',
    address: 'Sanjay Nagar Main Road, Bengaluru, Karnataka 560094',
    lat: 13.0360,
    lng: 77.5760,
  },
  {
    id: 'blr-vidyaranyapura',
    name: 'Vidyaranyapura',
    subtitle: 'Bengaluru North, Karnataka',
    address: 'Vidyaranyapura Main Road, Bengaluru, Karnataka 560097',
    lat: 13.0780,
    lng: 77.5560,
  },
  {
    id: 'blr-mathikere',
    name: 'Mathikere',
    subtitle: 'M S Ramaiah Area, Bengaluru',
    address: 'Mathikere, MS Ramaiah Nagar, Bengaluru, Karnataka 560054',
    lat: 13.0330,
    lng: 77.5580,
  },
  {
    id: 'blr-yeshwantpur',
    name: 'Yeshwantpur Railway Station',
    subtitle: 'Bengaluru, Karnataka',
    address: 'Yeshwantpur Junction Railway Station, Tumkur Road, Bengaluru, Karnataka 560022',
    lat: 13.0238,
    lng: 77.5501,
  },

  // ==================== BENGALURU WEST & CENTRAL ====================
  {
    id: 'blr-mg-road',
    name: 'MG Road Metro',
    subtitle: 'Central Bengaluru, Karnataka',
    address: 'MG Road, Shanthala Nagar, Ashok Nagar, Bengaluru, 560001',
    lat: 12.9756,
    lng: 77.6066,
    isRecentOrPopular: true,
  },
  {
    id: 'blr-brigade-road',
    name: 'Brigade Road',
    subtitle: 'Central Bengaluru, Karnataka',
    address: 'Brigade Road, Ashok Nagar, Bengaluru, Karnataka 560001',
    lat: 12.9715,
    lng: 77.6070,
  },
  {
    id: 'blr-majestic',
    name: 'Majestic / KSR Railway Station',
    subtitle: 'Kempegowda Bus Station, Bengaluru',
    address: 'Majestic, Kempegowda Bus Station, Bengaluru, Karnataka 560009',
    lat: 12.9767,
    lng: 77.5713,
  },
  {
    id: 'blr-malleshwaram',
    name: 'Malleshwaram 8th Cross',
    subtitle: 'Bengaluru, Karnataka',
    address: 'Margosa Road, Malleshwaram, Bengaluru, Karnataka 560003',
    lat: 13.0031,
    lng: 77.5702,
    isRecentOrPopular: true,
  },
  {
    id: 'blr-rajajinagar-1',
    name: 'Rajajinagar 1st Block',
    subtitle: 'Bengaluru, Karnataka',
    address: 'Dr Rajkumar Road, Rajajinagar, Bengaluru, Karnataka 560010',
    lat: 12.9982,
    lng: 77.5530,
    isRecentOrPopular: true,
  },
  {
    id: 'blr-rr-nagar',
    name: 'Rajarajeshwari Nagar (RR Nagar)',
    subtitle: 'Mysore Road, Bengaluru, Karnataka',
    address: 'Rajarajeshwari Nagar (RR Nagar), Mysore Road, Bengaluru, Karnataka 560098',
    lat: 12.9260,
    lng: 77.5180,
    isRecentOrPopular: true,
  },
  {
    id: 'blr-vijayanagar',
    name: 'Vijayanagar Metro',
    subtitle: 'Bengaluru, Karnataka',
    address: 'Vijayanagar Metro Station, Mysore Road, Bengaluru, Karnataka 560040',
    lat: 12.9690,
    lng: 77.5360,
  },
  {
    id: 'blr-nagarbhavi',
    name: 'Nagarbhavi 2nd Stage',
    subtitle: 'Bengaluru, Karnataka',
    address: 'Nagarbhavi 2nd Stage, Bengaluru, Karnataka 560072',
    lat: 12.9600,
    lng: 77.5090,
  },
  {
    id: 'blr-kengeri',
    name: 'Kengeri Satellite Town',
    subtitle: 'Mysore Road, Bengaluru',
    address: 'Kengeri Satellite Town, Mysore Road, Bengaluru, Karnataka 560060',
    lat: 12.9150,
    lng: 77.4820,
  },
  {
    id: 'blr-peenya',
    name: 'Peenya Industrial Area',
    subtitle: 'Tumkur Road, Bengaluru',
    address: 'Peenya Industrial Area, Tumkur Road, Bengaluru, Karnataka 560058',
    lat: 13.0300,
    lng: 77.5180,
  },
  {
    id: 'blr-basavanagudi',
    name: 'Basavanagudi DVG Road',
    subtitle: 'Bengaluru, Karnataka',
    address: 'DVG Road, Gandhi Bazaar, Basavanagudi, Bengaluru, Karnataka 560004',
    lat: 12.9420,
    lng: 77.5740,
  },
  {
    id: 'blr-shivajinagar',
    name: 'Shivajinagar Bus Station',
    subtitle: 'Bengaluru, Karnataka',
    address: 'Shivajinagar Bus Station, Russell Market, Bengaluru, Karnataka 560051',
    lat: 12.9850,
    lng: 77.6030,
  },

  // ==================== KARNATAKA DISTRICTS & MAJOR CITIES ====================
  {
    id: 'kar-mysuru',
    name: 'Mysuru (Mysore)',
    subtitle: 'Mysore District, Karnataka',
    address: 'Mysuru City, Mysore District, Karnataka 570001',
    lat: 12.2958,
    lng: 76.6394,
    isRecentOrPopular: true,
  },
  {
    id: 'kar-mangaluru',
    name: 'Mangaluru (Mangalore)',
    subtitle: 'Dakshina Kannada, Karnataka',
    address: 'Mangaluru City, Dakshina Kannada, Karnataka 575001',
    lat: 12.9141,
    lng: 74.8560,
    isRecentOrPopular: true,
  },
  {
    id: 'kar-hubballi',
    name: 'Hubballi (Hubli)',
    subtitle: 'Dharwad District, Karnataka',
    address: 'Hubballi City, Dharwad District, Karnataka 580020',
    lat: 15.3647,
    lng: 75.1240,
  },
  {
    id: 'kar-dharwad',
    name: 'Dharwad',
    subtitle: 'Dharwad District, Karnataka',
    address: 'Dharwad City, Karnataka 580001',
    lat: 15.4589,
    lng: 75.0078,
  },
  {
    id: 'kar-belagavi',
    name: 'Belagavi (Belgaum)',
    subtitle: 'Belagavi District, Karnataka',
    address: 'Belagavi City, Karnataka 590001',
    lat: 15.8497,
    lng: 74.4977,
  },
  {
    id: 'kar-tumakuru',
    name: 'Tumakuru (Tumkur)',
    subtitle: 'Tumkur District, Karnataka',
    address: 'Tumakuru City, Tumkur District, Karnataka 572101',
    lat: 13.3392,
    lng: 77.1017,
  },
  {
    id: 'kar-shivamogga',
    name: 'Shivamogga (Shimoga)',
    subtitle: 'Shimoga District, Karnataka',
    address: 'Shivamogga City, Shimoga District, Karnataka 577201',
    lat: 13.9299,
    lng: 75.5681,
  },
  {
    id: 'kar-ballari',
    name: 'Ballari (Bellary)',
    subtitle: 'Ballari District, Karnataka',
    address: 'Ballari City, Karnataka 583101',
    lat: 15.1394,
    lng: 76.9214,
  },
  {
    id: 'kar-udupi',
    name: 'Udupi',
    subtitle: 'Udupi District, Karnataka',
    address: 'Udupi City, Udupi District, Karnataka 576101',
    lat: 13.3409,
    lng: 74.7421,
  },
  {
    id: 'kar-hassan',
    name: 'Hassan',
    subtitle: 'Hassan District, Karnataka',
    address: 'Hassan City, Hassan District, Karnataka 573201',
    lat: 13.0033,
    lng: 76.1004,
  },
  {
    id: 'kar-mandya',
    name: 'Mandya',
    subtitle: 'Mandya District, Karnataka',
    address: 'Mandya City, Bengaluru-Mysuru Expressway, Karnataka 571401',
    lat: 12.5226,
    lng: 76.8976,
  },
  {
    id: 'kar-ramanagara',
    name: 'Ramanagara',
    subtitle: 'Ramanagara District, Karnataka',
    address: 'Ramanagara Town, Karnataka 562159',
    lat: 12.7209,
    lng: 77.2799,
  },
  {
    id: 'kar-kolar',
    name: 'Kolar',
    subtitle: 'Kolar District, Karnataka',
    address: 'Kolar Town, Karnataka 563101',
    lat: 13.1362,
    lng: 78.1291,
  },
  {
    id: 'kar-kgf',
    name: 'Kolar Gold Fields (KGF)',
    subtitle: 'Kolar, Karnataka',
    address: 'Robertsonpet, Kolar Gold Fields, Karnataka 563122',
    lat: 12.9600,
    lng: 78.2700,
  },
  {
    id: 'kar-hoskote',
    name: 'Hoskote',
    subtitle: 'Bengaluru Rural, Karnataka',
    address: 'Hoskote Town, Bengaluru Rural, Karnataka 562114',
    lat: 13.0699,
    lng: 77.7981,
  },
  {
    id: 'kar-anekal',
    name: 'Anekal',
    subtitle: 'Bengaluru Urban, Karnataka',
    address: 'Anekal Town, Bengaluru Urban, Karnataka 562106',
    lat: 12.7100,
    lng: 77.6970,
  },
  {
    id: 'kar-madikeri',
    name: 'Madikeri (Coorg)',
    subtitle: 'Kodagu District, Karnataka',
    address: 'Madikeri, Coorg, Kodagu District, Karnataka 571201',
    lat: 12.4244,
    lng: 75.7382,
  },
  {
    id: 'kar-karwar',
    name: 'Karwar',
    subtitle: 'Uttara Kannada, Karnataka',
    address: 'Karwar Port City, Uttara Kannada, Karnataka 581301',
    lat: 14.8136,
    lng: 74.1298,
  },
  {
    id: 'kar-gokarna',
    name: 'Gokarna',
    subtitle: 'Uttara Kannada, Karnataka',
    address: 'Gokarna Beach, Kumta, Uttara Kannada, Karnataka 581326',
    lat: 14.5479,
    lng: 74.3188,
  },
  {
    id: 'kar-kalaburagi',
    name: 'Kalaburagi (Gulbarga)',
    subtitle: 'Kalaburagi District, Karnataka',
    address: 'Kalaburagi City, Karnataka 585101',
    lat: 17.3297,
    lng: 76.8343,
  },
  {
    id: 'kar-bidar',
    name: 'Bidar',
    subtitle: 'Bidar District, Karnataka',
    address: 'Bidar Fort City, Karnataka 585401',
    lat: 17.9104,
    lng: 77.5199,
  },
  {
    id: 'kar-vijayapura',
    name: 'Vijayapura (Bijapur)',
    subtitle: 'Vijayapura District, Karnataka',
    address: 'Vijayapura City (Gol Gumbaz), Karnataka 586101',
    lat: 16.8302,
    lng: 75.7100,
  },
  {
    id: 'kar-chitradurga',
    name: 'Chitradurga',
    subtitle: 'Chitradurga District, Karnataka',
    address: 'Chitradurga Fort City, Karnataka 577501',
    lat: 14.2251,
    lng: 76.3980,
  },
]

const POPULAR_HUBS = [
  { name: 'Manyata Tech Park', address: 'Manyata Tech Park, Nagavara, Outer Ring Road, Bengaluru, 560045', lat: 13.0475, lng: 77.6202 },
  { name: 'Indiranagar 100ft Rd', address: '100 Feet Rd, HAL 2nd Stage, Indiranagar, Bengaluru, 560038', lat: 12.9784, lng: 77.6408 },
  { name: 'Koramangala 4th Block', address: '80 Feet Rd, 4th Block, Koramangala, Bengaluru, 560034', lat: 12.9352, lng: 77.6245 },
  { name: 'MG Road Metro', address: 'MG Road, Shanthala Nagar, Ashok Nagar, Bengaluru, 560001', lat: 12.9756, lng: 77.6066 },
  { name: 'Whitefield ITPL', address: 'International Tech Park (ITPL), Whitefield Main Rd, Bengaluru, 560066', lat: 12.9863, lng: 77.7383 },
  { name: 'Electronic City Ph 1', address: 'Hosur Rd, Electronic City Phase 1, Bengaluru, 560100', lat: 12.8452, lng: 77.6602 },
  { name: 'HSR Layout Sector 1', address: '27th Main Rd, Sector 1, HSR Layout, Bengaluru, 560102', lat: 12.9121, lng: 77.6446 },
]

export const LocationMapModal: React.FC<LocationMapModalProps> = ({
  isOpen,
  onClose,
  onSelectLocation,
  title = 'Select Location on Map',
  initialAddress = '',
}) => {
  const [selectedAddress, setSelectedAddress] = useState(initialAddress)
  const [selectedCoords, setSelectedCoords] = useState<{ lat: number; lng: number }>({ lat: 12.9716, lng: 77.5946 })
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const [isLiveFetching, setIsLiveFetching] = useState(false)

  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const markerRef = useRef<any>(null)
  const searchContainerRef = useRef<HTMLDivElement>(null)
  const debounceTimerRef = useRef<any>(null)
  const activeReqRef = useRef<number>(0)

  useEffect(() => {
    if (initialAddress) {
      setSelectedAddress(initialAddress)
      setSearchQuery(initialAddress)
    }
  }, [initialAddress])

  // Initialize Leaflet Map when modal opens
  useEffect(() => {
    if (!isOpen) {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
      setShowDropdown(false)
      setSuggestions([])
      return
    }

    const timer = setTimeout(() => {
      const L = (window as any).L
      if (!L || !mapContainerRef.current) return

      if (!mapInstanceRef.current) {
        const map = L.map(mapContainerRef.current).setView([selectedCoords.lat, selectedCoords.lng], 13)

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '&copy; OpenStreetMap contributors',
        }).addTo(map)

        const marker = L.marker([selectedCoords.lat, selectedCoords.lng], { draggable: true }).addTo(map)
        marker.bindPopup('<b>Selected Location</b><br>Drag pin or click map to change').openPopup()

        marker.on('dragend', async () => {
          const pos = marker.getLatLng()
          setSelectedCoords({ lat: pos.lat, lng: pos.lng })
          reverseGeocode(pos.lat, pos.lng)
        })

        map.on('click', (e: any) => {
          marker.setLatLng(e.latlng)
          setSelectedCoords({ lat: e.latlng.lat, lng: e.latlng.lng })
          reverseGeocode(e.latlng.lat, e.latlng.lng)
        })

        mapInstanceRef.current = map
        markerRef.current = marker
      } else {
        mapInstanceRef.current.invalidateSize()
      }
    }, 200)

    return () => clearTimeout(timer)
  }, [isOpen])

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Reverse geocoding when clicking or dragging marker
  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`)
      const data = await res.json()
      if (data && data.display_name) {
        setSelectedAddress(data.display_name)
      } else {
        setSelectedAddress(`Location at (${lat.toFixed(4)}, ${lng.toFixed(4)})`)
      }
    } catch {
      setSelectedAddress(`Location at (${lat.toFixed(4)}, ${lng.toFixed(4)})`)
    }
  }

  /**
   * Fast local search (0ms) + Photon Real-Time Autocomplete Engine + Nominatim Fallback
   */
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setSearchQuery(val)
    setActiveIndex(-1)

    const clean = val.trim().toLowerCase()
    if (!clean) {
      setSuggestions([])
      setShowDropdown(false)
      return
    }

    // 1. Instant local filter (0ms delay) across our 120+ curated localities
    const localMatches = KNOWN_LOCALITIES.filter((loc) => {
      const nameMatch = loc.name.toLowerCase().includes(clean)
      const subMatch = loc.subtitle.toLowerCase().includes(clean)
      const addrMatch = loc.address.toLowerCase().includes(clean)
      return nameMatch || subMatch || addrMatch
    })

    // Sort to prioritize items whose name starts with the search query
    localMatches.sort((a, b) => {
      const aStarts = a.name.toLowerCase().startsWith(clean)
      const bStarts = b.name.toLowerCase().startsWith(clean)
      if (aStarts && !bStarts) return -1
      if (!aStarts && bStarts) return 1
      return 0
    })

    setSuggestions(localMatches)
    setShowDropdown(true)

    // 2. Query Photon Geocoder (Elasticsearch on OpenStreetMap, built specifically for as-you-type autocomplete)
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    if (clean.length >= 2) {
      const reqId = Date.now()
      activeReqRef.current = reqId
      setIsLiveFetching(true)

      debounceTimerRef.current = setTimeout(async () => {
        try {
          // Photon query biased by Bengaluru/Karnataka center coordinates
          const photonUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(
            clean
          )}&lat=12.9716&lon=77.5946&limit=10`
          const res = await fetch(photonUrl)
          const data = await res.json()

          if (activeReqRef.current === reqId && data && Array.isArray(data.features)) {
            const photonResults: LocationSuggestion[] = data.features.map((f: any, i: number) => {
              const p = f.properties || {}
              const name = p.name || p.street || clean
              const locality = p.city || p.district || p.county || ''
              const state = p.state || (p.country === 'India' ? 'Karnataka' : p.country || 'Karnataka')
              const subtitle = locality ? `${locality}, ${state}` : state
              const lat = parseFloat(f.geometry.coordinates[1])
              const lng = parseFloat(f.geometry.coordinates[0])
              const address = [name, locality, state, p.postcode].filter(Boolean).join(', ')

              return {
                id: `photon-${lat}-${lng}-${i}`,
                name,
                subtitle,
                address,
                lat,
                lng,
                isRecentOrPopular: false,
              }
            })

            // Merge local and online, avoiding duplicate place names
            setSuggestions((prev) => {
              const seen = new Set(prev.map((p) => p.name.toLowerCase().trim()))
              const filteredOnline = photonResults.filter((o) => !seen.has(o.name.toLowerCase().trim()))
              return [...prev, ...filteredOnline]
            })
          }
        } catch (photonErr) {
          console.warn('Photon fetch fallback to Nominatim:', photonErr)
          // Fallback to Nominatim if Photon is unreachable
          try {
            const nomUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
              clean
            )}&countrycodes=in&viewbox=74.0,11.5,78.6,18.5&limit=6&addressdetails=1`
            const nomRes = await fetch(nomUrl)
            const nomData = await nomRes.json()

            if (activeReqRef.current === reqId && Array.isArray(nomData)) {
              const nomResults: LocationSuggestion[] = nomData.map((item: any, i: number) => {
                const parts = (item.display_name || '').split(',')
                const mainName = item.name || parts[0]?.trim() || clean
                const regionParts = parts.slice(1, 3).map((p: string) => p.trim()).filter(Boolean)
                const subtitle = regionParts.length > 0 ? regionParts.join(', ') : 'Karnataka'

                return {
                  id: `nom-${item.place_id || i}`,
                  name: mainName,
                  subtitle,
                  address: item.display_name,
                  lat: parseFloat(item.lat),
                  lng: parseFloat(item.lon),
                  isRecentOrPopular: false,
                }
              })

              setSuggestions((prev) => {
                const seen = new Set(prev.map((p) => p.name.toLowerCase().trim()))
                const filtered = nomResults.filter((o) => !seen.has(o.name.toLowerCase().trim()))
                return [...prev, ...filtered]
              })
            }
          } catch (nomErr) {
            console.warn('Nominatim fallback error:', nomErr)
          }
        } finally {
          if (activeReqRef.current === reqId) {
            setIsLiveFetching(false)
          }
        }
      }, 200)
    } else {
      setIsLiveFetching(false)
    }
  }

  /**
   * Apply selected location to map and input
   */
  const applyLocation = (name: string, address: string, lat: number, lng: number) => {
    setSelectedCoords({ lat, lng })
    setSelectedAddress(address)
    setSearchQuery(name)
    setShowDropdown(false)
    setSuggestions([])

    if (mapInstanceRef.current && markerRef.current) {
      mapInstanceRef.current.setView([lat, lng], 15)
      markerRef.current.setLatLng([lat, lng])
      markerRef.current.bindPopup(`<b>${name}</b><br/><span style="font-size:11px">${address}</span>`).openPopup()
    }
  }

  // Handle manual Enter / click Search Map
  const handleSearchSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!searchQuery.trim()) return

    // If an item in dropdown is active or there is a top suggestion matching, pick it
    if (suggestions.length > 0) {
      const pick = activeIndex >= 0 ? suggestions[activeIndex] : suggestions[0]
      applyLocation(pick.name, pick.address, pick.lat, pick.lng)
      return
    }

    setIsSearching(true)
    setShowDropdown(false)
    try {
      const q = encodeURIComponent(`${searchQuery}, Karnataka, India`)
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${q}&limit=1`)
      const results = await res.json()
      if (results && results.length > 0) {
        const item = results[0]
        const lat = parseFloat(item.lat)
        const lng = parseFloat(item.lon)
        applyLocation(item.display_name.split(',')[0], item.display_name, lat, lng)
      }
    } catch (err) {
      console.error('Search error:', err)
    } finally {
      setIsSearching(false)
    }
  }

  // Keyboard navigation for dropdown
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showDropdown || suggestions.length === 0) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (activeIndex >= 0 && suggestions[activeIndex]) {
        const item = suggestions[activeIndex]
        applyLocation(item.name, item.address, item.lat, item.lng)
      } else {
        handleSearchSubmit()
      }
    } else if (e.key === 'Escape') {
      setShowDropdown(false)
    }
  }

  const handleSelectHub = (hub: typeof POPULAR_HUBS[0]) => {
    applyLocation(hub.name, hub.address, hub.lat, hub.lng)
  }

  const handleConfirm = () => {
    onSelectLocation(selectedAddress || searchQuery, selectedCoords.lat, selectedCoords.lng)
    onClose()
  }

  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    selectedAddress || `${selectedCoords.lat},${selectedCoords.lng}`
  )}`

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="lg"
      footer={
        <div className="flex items-center justify-between w-full">
          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 font-semibold"
          >
            <span>Open in Google Maps</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!selectedAddress && !searchQuery}
              className="btn-primary py-2 px-5 text-xs font-bold flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Confirm Location</span>
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-3 relative">
        {/* Search Bar with Google Maps Style Autocomplete */}
        <div ref={searchContainerRef} className="relative z-[3000]">
          <form onSubmit={handleSearchSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search any locality, landmark or town (e.g. chik, dan, Indiranagar)..."
                value={searchQuery}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                onFocus={() => {
                  if (suggestions.length > 0) setShowDropdown(true)
                }}
                className="input pl-10 pr-9 text-xs sm:text-sm font-medium w-full shadow-sm focus:ring-2 focus:ring-blue-500"
                autoComplete="off"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('')
                    setSuggestions([])
                    setShowDropdown(false)
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <button
              type="submit"
              disabled={isSearching}
              className="btn-accent text-xs px-4 py-2 font-bold whitespace-nowrap shadow-sm flex items-center gap-1.5"
            >
              {isSearching ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Searching...</span>
                </>
              ) : (
                'Search Map'
              )}
            </button>
          </form>

          {/* Google Maps Style Autocomplete Dropdown List */}
          {showDropdown && (
            <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-xl shadow-2xl border border-slate-200/90 overflow-hidden divide-y divide-slate-100 max-h-72 overflow-y-auto z-[9999]">
              {suggestions.length > 0 ? (
                suggestions.map((loc, idx) => {
                  const isCurrentActive = idx === activeIndex
                  return (
                    <div
                      key={loc.id || `${loc.lat}-${loc.lng}-${idx}`}
                      onClick={() => applyLocation(loc.name, loc.address, loc.lat, loc.lng)}
                      onMouseEnter={() => setActiveIndex(idx)}
                      className={`px-4 py-3 flex items-center gap-3.5 cursor-pointer transition-colors ${
                        isCurrentActive ? 'bg-slate-100/90' : 'hover:bg-slate-50'
                      }`}
                    >
                      {/* Google Maps Style Icon */}
                      <div className="text-slate-500 flex-shrink-0">
                        {loc.isRecentOrPopular ? (
                          <Clock className="w-4 h-4 text-slate-500" />
                        ) : (
                          <MapPin className="w-4 h-4 text-slate-500" />
                        )}
                      </div>

                      {/* Locality Bold + Subtitle on same line */}
                      <div className="flex-1 min-w-0 text-left">
                        <span className="text-sm font-semibold text-slate-900">
                          {loc.name}
                        </span>
                        {loc.subtitle && (
                          <span className="text-sm font-normal text-slate-500 ml-2">
                            {loc.subtitle}
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })
              ) : (
                <div className="px-4 py-3 text-center text-xs text-slate-500">
                  {isLiveFetching ? (
                    <span className="flex items-center justify-center gap-1.5 text-blue-600">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Searching Karnataka locations...
                    </span>
                  ) : (
                    'No matching locations found. Press "Search Map" to query broader region.'
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Quick Hub Chips */}
        <div>
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
            Popular Bengaluru Hubs:
          </p>
          <div className="flex flex-wrap gap-1.5">
            {POPULAR_HUBS.map((hub) => (
              <button
                key={hub.name}
                type="button"
                onClick={() => handleSelectHub(hub)}
                className="px-2.5 py-1 text-[11px] rounded-full bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 font-medium transition-colors border border-slate-200/60"
              >
                {hub.name}
              </button>
            ))}
          </div>
        </div>

        {/* Map Container */}
        <div className="relative rounded-2xl overflow-hidden border border-slate-200 shadow-inner h-[280px] z-[1]">
          <div ref={mapContainerRef} className="w-full h-full" />
          <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-md px-2.5 py-1 rounded-md text-[10px] font-semibold text-slate-700 shadow border border-slate-200 pointer-events-none z-[1000]">
            📍 Click map or drag pin to pick location
          </div>
        </div>

        {/* Selected Address Display */}
        <div className="p-3 rounded-xl bg-blue-50/80 border border-blue-200/80 flex items-start gap-2.5 text-xs">
          <MapPin className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-bold text-blue-950">Selected Address: </span>
            <span className="text-blue-900 font-medium break-words">
              {selectedAddress || searchQuery || 'Click on the map or choose a location above'}
            </span>
          </div>
        </div>
      </div>
    </Modal>
  )
}

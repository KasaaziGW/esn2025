/**
 * Comprehensive list of international country calling codes
 * This utility provides country codes for phone number validation
 */

const COUNTRY_CODES = [
  // North America
  '+1', // US/Canada
  
  // Europe
  '+44', // UK
  '+33', // France
  '+49', // Germany
  '+39', // Italy
  '+34', // Spain
  '+31', // Netherlands
  '+32', // Belgium
  '+45', // Denmark
  '+46', // Sweden
  '+47', // Norway
  '+358', // Finland
  '+41', // Switzerland
  '+43', // Austria
  '+48', // Poland
  '+420', // Czech Republic
  '+36', // Hungary
  '+40', // Romania
  '+359', // Bulgaria
  '+385', // Croatia
  '+386', // Slovenia
  '+372', // Estonia
  '+371', // Latvia
  '+370', // Lithuania
  '+353', // Ireland
  '+351', // Portugal
  '+30', // Greece
  '+357', // Cyprus
  '+356', // Malta
  '+352', // Luxembourg
  '+377', // Monaco
  '+378', // San Marino
  '+43', // Liechtenstein
  '+41', // Andorra
  '+380', // Ukraine
  '+381', // Serbia
  '+382', // Montenegro
  '+383', // Kosovo
  '+387', // Bosnia and Herzegovina
  '+389', // North Macedonia
  '+421', // Slovakia
  '+423', // Liechtenstein
  '+354', // Iceland
  '+355', // Albania
  '+373', // Moldova
  '+374', // Armenia
  '+375', // Belarus
  '+376', // Andorra
  '+500', // Falkland Islands
  '+290', // Saint Helena
  '+297', // Aruba
  '+298', // Faroe Islands
  '+299', // Greenland
  '+350', // Gibraltar
  '+262', // Réunion
  
  // Asia
  '+81', // Japan
  '+86', // China
  '+82', // South Korea
  '+65', // Singapore
  '+60', // Malaysia
  '+66', // Thailand
  '+84', // Vietnam
  '+63', // Philippines
  '+62', // Indonesia
  '+91', // India
  '+92', // Pakistan
  '+880', // Bangladesh
  '+94', // Sri Lanka
  '+977', // Nepal
  '+975', // Bhutan
  '+960', // Maldives
  '+93', // Afghanistan
  '+98', // Iran
  '+964', // Iraq
  '+90', // Turkey
  '+7', // Russia/Kazakhstan
  '+998', // Uzbekistan
  '+996', // Kyrgyzstan
  '+992', // Tajikistan
  '+993', // Turkmenistan
  '+995', // Georgia
  '+994', // Azerbaijan
  '+850', // North Korea
  '+886', // Taiwan
  '+852', // Hong Kong
  '+853', // Macau
  '+855', // Cambodia
  '+856', // Laos
  '+95', // Myanmar
  '+673', // Brunei
  '+670', // East Timor
  '+976', // Mongolia
  '+961', // Lebanon
  '+962', // Jordan
  '+963', // Syria
  '+965', // Kuwait
  '+966', // Saudi Arabia
  '+967', // Yemen
  '+968', // Oman
  '+970', // Palestine
  '+971', // United Arab Emirates
  '+972', // Israel
  '+973', // Bahrain
  '+974', // Qatar
  
  // Africa
  '+234', // Nigeria
  '+254', // Kenya
  '+256', // Uganda
  '+255', // Tanzania
  '+250', // Rwanda
  '+257', // Burundi
  '+243', // Democratic Republic of Congo
  '+242', // Republic of Congo
  '+236', // Central African Republic
  '+235', // Chad
  '+237', // Cameroon
  '+240', // Equatorial Guinea
  '+241', // Gabon
  '+239', // São Tomé and Príncipe
  '+238', // Cape Verde
  '+220', // Gambia
  '+221', // Senegal
  '+223', // Mali
  '+224', // Guinea
  '+225', // Côte d'Ivoire
  '+226', // Burkina Faso
  '+227', // Niger
  '+228', // Togo
  '+229', // Benin
  '+230', // Mauritius
  '+231', // Liberia
  '+232', // Sierra Leone
  '+233', // Ghana
  '+245', // Guinea-Bissau
  '+246', // British Indian Ocean Territory
  '+248', // Seychelles
  '+249', // Sudan
  '+251', // Ethiopia
  '+252', // Somalia
  '+253', // Djibouti
  '+258', // Mozambique
  '+259', // Eritrea
  '+260', // Zambia
  '+261', // Madagascar
  '+263', // Zimbabwe
  '+264', // Namibia
  '+265', // Malawi
  '+266', // Lesotho
  '+267', // Botswana
  '+268', // Eswatini
  '+269', // Comoros
  '+291', // Eritrea
  
  // Americas
  '+501', // Belize
  '+502', // Guatemala
  '+503', // El Salvador
  '+504', // Honduras
  '+505', // Nicaragua
  '+506', // Costa Rica
  '+507', // Panama
  '+508', // Saint Pierre and Miquelon
  '+509', // Haiti
  '+590', // Guadeloupe
  '+591', // Bolivia
  '+592', // Guyana
  '+593', // Ecuador
  '+594', // French Guiana
  '+595', // Paraguay
  '+596', // Martinique
  '+597', // Suriname
  '+598', // Uruguay
  '+599', // Netherlands Antilles
  
  // Oceania
  '+672', // Australian External Territories
  '+674', // Nauru
  '+675', // Papua New Guinea
  '+676', // Tonga
  '+677', // Solomon Islands
  '+678', // Vanuatu
  '+679', // Fiji
  '+680', // Palau
  '+681', // Wallis and Futuna
  '+682', // Cook Islands
  '+683', // Niue
  '+684', // American Samoa
  '+685', // Samoa
  '+686', // Kiribati
  '+687', // New Caledonia
  '+688', // Tuvalu
  '+689', // French Polynesia
  '+690', // Tokelau
  '+691', // Micronesia
  '+692', // Marshall Islands
];

/**
 * Get country codes sorted by length (longest first)
 * This helps with more specific country codes being matched first
 */
const getSortedCountryCodes = () => {
  return [...COUNTRY_CODES].sort((a, b) => b.length - a.length);
};

/**
 * Get country codes for a specific region
 */
const getCountryCodesByRegion = {
  europe: [
    '+44', '+33', '+49', '+39', '+34', '+31', '+32', '+45', '+46', '+47',
    '+358', '+41', '+43', '+48', '+420', '+36', '+40', '+359', '+385',
    '+386', '+372', '+371', '+370', '+353', '+351', '+30', '+357', '+356',
    '+352', '+377', '+378', '+380', '+381', '+382', '+383', '+387', '+389',
    '+421', '+423', '+354', '+355', '+373', '+374', '+375', '+376', '+500',
    '+290', '+297', '+298', '+299', '+350', '+262'
  ],
  asia: [
    '+81', '+86', '+82', '+65', '+60', '+66', '+84', '+63', '+62', '+91',
    '+92', '+880', '+94', '+977', '+975', '+960', '+93', '+98', '+964', '+90',
    '+7', '+998', '+996', '+992', '+993', '+995', '+994', '+850', '+886',
    '+852', '+853', '+855', '+856', '+95', '+673', '+670', '+976', '+961',
    '+962', '+963', '+965', '+966', '+967', '+968', '+970', '+971', '+972',
    '+973', '+974'
  ],
  africa: [
    '+234', '+254', '+256', '+255', '+250', '+257', '+243', '+242', '+236',
    '+235', '+237', '+240', '+241', '+239', '+238', '+220', '+221', '+223',
    '+224', '+225', '+226', '+227', '+228', '+229', '+230', '+231', '+232',
    '+233', '+245', '+246', '+248', '+249', '+251', '+252', '+253', '+258',
    '+259', '+260', '+261', '+263', '+264', '+265', '+266', '+267', '+268',
    '+269', '+291'
  ],
  americas: [
    '+1', '+501', '+502', '+503', '+504', '+505', '+506', '+507', '+508',
    '+509', '+590', '+591', '+592', '+593', '+594', '+595', '+596', '+597',
    '+598', '+599'
  ],
  oceania: [
    '+672', '+674', '+675', '+676', '+677', '+678', '+679', '+680', '+681',
    '+682', '+683', '+684', '+685', '+686', '+687', '+688', '+689', '+690',
    '+691', '+692'
  ]
};

/**
 * Get a random country code (useful for testing)
 */
const getRandomCountryCode = () => {
  return COUNTRY_CODES[Math.floor(Math.random() * COUNTRY_CODES.length)];
};

/**
 * Check if a country code exists in our list
 */
const isValidCountryCode = (code) => {
  return COUNTRY_CODES.includes(code);
};

/**
 * Get country code info by code
 */
const getCountryCodeInfo = (code) => {
  const codeMap = {
    '+1': { country: 'US/Canada', region: 'North America' },
    '+44': { country: 'UK', region: 'Europe' },
    '+33': { country: 'France', region: 'Europe' },
    '+49': { country: 'Germany', region: 'Europe' },
    '+39': { country: 'Italy', region: 'Europe' },
    '+34': { country: 'Spain', region: 'Europe' },
    '+81': { country: 'Japan', region: 'Asia' },
    '+86': { country: 'China', region: 'Asia' },
    '+91': { country: 'India', region: 'Asia' },
    '+234': { country: 'Nigeria', region: 'Africa' },
    '+254': { country: 'Kenya', region: 'Africa' },
    '+256': { country: 'Uganda', region: 'Africa' },
    // Add more mappings as needed
  };
  
  return codeMap[code] || { country: 'Unknown', region: 'Unknown' };
};

export default {
  COUNTRY_CODES,
  getSortedCountryCodes,
  getCountryCodesByRegion,
  getRandomCountryCode,
  isValidCountryCode,
  getCountryCodeInfo
};

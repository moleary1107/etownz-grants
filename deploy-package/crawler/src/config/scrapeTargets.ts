// Irish Grant Sources Configuration
export interface ScrapeTarget {
  name: string;
  baseUrl: string;
  type: 'government' | 'council' | 'eu' | 'foundation';
  crawlPattern?: string;
  customSelectors?: {
    title?: string;
    description?: string;
    deadline?: string;
    amount?: string;
    funder?: string;
  };
  enabled: boolean;
}

export const IRISH_GRANT_SOURCES: ScrapeTarget[] = [
  // Government Sources
  {
    name: "Enterprise Ireland",
    baseUrl: "https://www.enterprise-ireland.com",
    type: "government",
    crawlPattern: "/en/funding-supports/",
    enabled: true
  },
  {
    name: "Science Foundation Ireland",
    baseUrl: "https://www.sfi.ie",
    type: "government", 
    crawlPattern: "/funding/",
    enabled: true
  },
  {
    name: "IDA Ireland",
    baseUrl: "https://www.idaireland.com",
    type: "government",
    crawlPattern: "/investment-incentives/",
    enabled: true
  },
  {
    name: "Department of Enterprise",
    baseUrl: "https://www.gov.ie/en/organisation/department-of-enterprise-trade-and-employment/",
    type: "government",
    crawlPattern: "/funding/",
    enabled: true
  },
  
  // Local Councils
  {
    name: "Dublin City Council",
    baseUrl: "https://www.dublincity.ie",
    type: "council",
    crawlPattern: "/business/grants-and-funding/",
    enabled: true
  },
  {
    name: "Cork City Council", 
    baseUrl: "https://www.corkcity.ie",
    type: "council",
    crawlPattern: "/services/business/",
    enabled: true
  },
  {
    name: "Galway City Council",
    baseUrl: "https://www.galwaycity.ie",
    type: "council", 
    crawlPattern: "/business/",
    enabled: true
  },
  
  // EU Sources
  {
    name: "Horizon Europe",
    baseUrl: "https://ec.europa.eu/info/funding-tenders/opportunities/portal/",
    type: "eu",
    crawlPattern: "/screen/home",
    enabled: true
  },
  {
    name: "Interreg Europe",
    baseUrl: "https://www.interregeurope.eu",
    type: "eu",
    crawlPattern: "/programme/calls/",
    enabled: true
  },
  
  // Foundations
  {
    name: "The Ireland Funds",
    baseUrl: "https://irelandfunds.org",
    type: "foundation",
    crawlPattern: "/grants/",
    enabled: true
  },
  {
    name: "Community Foundation for Ireland",
    baseUrl: "https://www.communityfoundation.ie",
    type: "foundation",
    crawlPattern: "/grants/",
    enabled: true
  }
];

export const CRAWL_CONFIG = {
  // How often to crawl each source (in hours)
  crawlInterval: {
    government: 24,    // Daily
    council: 48,       // Every 2 days  
    eu: 72,           // Every 3 days
    foundation: 168   // Weekly
  },
  
  // Rate limiting
  requestDelay: 2000, // 2 seconds between requests
  maxConcurrentRequests: 3,
  
  // Content extraction
  minDescriptionLength: 100,
  maxDescriptionLength: 5000,
  
  // Retry logic
  maxRetries: 3,
  retryDelay: 5000
};
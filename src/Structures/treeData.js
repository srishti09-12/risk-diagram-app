// File: src/structure/treeData.js

export const trees = {
  LoanProcessTree: {
    componentMap: {
      ULSHIP: ['AEAPS', 'ULDEC', 'DEPCT'],
      ULDEC: ['ULDEC_PRICING', 'UMGM'],
      DEPCT: ['CMBS1', 'CORD', 'FICO_DMP'],
      ULAPY: ['ULDEC2', 'FRIES'],
      ULDEC2: ['DEPCT2'],
      DEPCT2: ['CMBS1_2'],
      FRIES: ['FRAUD', 'IDPF', 'CIP', 'SOCURE'],
      CIP: ['ECBSV', 'LEXIS', 'EWS'],
      ULAPY_LOAD: ['ACAPS'],
      ACAPS: ['SHAW'],
      SHAW: ['EIW', 'BMG']
    }
  },
  FraudDetectionTree: {
    componentMap: {
      FRAUDSYS: ['MONITOR', 'TRIGGER'],
      TRIGGER: ['ANALYZER', 'REPORTER'],
      MONITOR: ['LOGGER', 'AGGREGATOR']
    }
  },
  AuthFlowTree: {
    componentMap: {
      LOGIN: ['AUTH', 'FA'],
      AUTH: ['TOKEN', 'SESSION'],
      FA: ['OTP', 'BIOMETRIC']
    }
  }
};

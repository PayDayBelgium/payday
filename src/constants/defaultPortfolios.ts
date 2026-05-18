import SaxoLogo from '../assets/portfolios/Saxo.png';
import DeGiroLogo from '../assets/portfolios/DeGiro.png';
import LynxLogo from '../assets/portfolios/Lynx.png';
import IBKRLogo from '../assets/portfolios/IBKR.jpeg';
import BoleroLogo from '../assets/portfolios/Bolero.png';

export interface DefaultPortfolio {
  id: string;
  name: string;
  logo: string;
}

export const DEFAULT_PORTFOLIOS: DefaultPortfolio[] = [
  {
    id: 'saxo',
    name: 'Saxo Bank',
    logo: SaxoLogo,
  },
  {
    id: 'degiro',
    name: 'DeGiro',
    logo: DeGiroLogo,
  },
  {
    id: 'lynx',
    name: 'Lynx',
    logo: LynxLogo,
  },
  {
    id: 'ibkr',
    name: 'Interactive Portfolios',
    logo: IBKRLogo,
  },
  {
    id: 'bolero',
    name: 'Bolero',
    logo: BoleroLogo,
  },
];

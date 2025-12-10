import SaxoLogo from '../assets/Portfolios/Saxo.png';
import DeGiroLogo from '../assets/Portfolios/DeGiro.png';
import LynxLogo from '../assets/Portfolios/Lynx.png';
import IBKRLogo from '../assets/Portfolios/IBKR.jpeg';
import BoleroLogo from '../assets/Portfolios/Bolero.png';

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

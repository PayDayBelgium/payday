import type { PortfolioName } from '../types';
import LogoLynx from '../assets/LogoLynx.png';
import LogoFreeStoxx from '../assets/LogoFreestoxx.png';
import LogoDeGiro from '../assets/LogoDeGiro.png';
import LogoSaxo from '../assets/LogoSaxo.png';

export const portfolioLogos: Record<PortfolioName, string> = {
  Lynx: LogoLynx,
  FreeStoxx: LogoFreeStoxx,
  DeGiro: LogoDeGiro,
  SAXO: LogoSaxo,
};

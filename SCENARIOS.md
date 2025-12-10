# Trading log scenario's

## Deposit
- Deposit 10.000 
   (Portfolio Value: 10.000; Short: 0; Long: 0; Cash: 10.000; Free cash: 10.000)
- Withtdrawal 5.000
   (Portfolio Value: 5.000; Short: 0; Long: 0; Cash: 5.000; Free cash: 5.000)
- Adjust to 10.000
   (Portfolio Value: 10.000; Short: 0; Long: 0; Cash: 10.000; Free cash: 10.000)

## Stocks
- Buy HIMS stock [price: 30; quantity: 10]
   (Portfolio Value: 10000; Short: 0; Long: 300; Cash: 9700; Free cash: 9700)
- Sell HIMS stock [price: 50; quantity: 10] 
   (Portfolio Value: 10200; Short: 0; Long: 0; Cash: 10200; Free cash: 10200)
- Buy HIMS stock [price: 50; quantity: 10]
   (Portfolio Value: 10200; Short: 0; Long: 500; Cash: 9700; Free cash: 9700)
- Sell HIMS stock [price: 30; quantity: 10] 
   (Portfolio Value: 10000; Short: 0; Long: 0; Cash: 10000; Free cash: 10000)

## Single options

### Call option (buy)
- Buy HIMS call option [price: 0.30; quantity: 10]
   (Portfolio Value: 10000; Short: 0; Long: 300; Cash: 9700; Free cash: 9700)
- Sell HIMS call option [price: 0.5; quantity: 10] 
   (Portfolio Value: 10200; Short: 0; Long: 0; Cash: 10200; Free cash: 10200)
- Buy HIMS call option [price: 0.5; quantity: 10]
   (Portfolio Value: 10200; Short: 0; Long: 500; Cash: 9700; Free cash: 9700)
- Sell HIMS call option [price: 0.3; quantity: 10] 
   (Portfolio Value: 10000; Short: 0; Long: 0; Cash: 10000; Free cash: 10000)

### Call option (sell)
- Sell HIMS call option [price: 0.30; quantity: 10]
   (Portfolio Value: 10000; Short: 300; Long: 0; Cash: 10300; Free cash: 10000)
- Buy back HIMS call option [price: 0.5; quantity: 10] 
   (Portfolio Value: 9800; Short: 0; Long: 0; Cash: 9800; Free cash: 9800)
- Sell HIMS call option [price: 0.5; quantity: 10]
   (Portfolio Value: 9800; Short: 500; Long: 0; Cash: 10300; Free cash: 9800)
- Buy back HIMS call option [price: 0.3; quantity: 10] 
   (Portfolio Value: 10000; Short: 0; Long: 0; Cash: 10000; Free cash: 10000)

   
### Put option (buy)
- Buy HIMS put option [price: 0.30; quantity: 10]
   (Portfolio Value: 10000; Short: 0; Long: 300; Cash: 9700; Free cash: 9700)
- Sell HIMS put option [price: 0.5; quantity: 10] 
   (Portfolio Value: 10200; Short: 0; Long: 0; Cash: 10200; Free cash: 10200)
- Buy HIMS put option [price: 0.5; quantity: 10]
   (Portfolio Value: 10200; Short: 0; Long: 500; Cash: 9700; Free cash: 9700)
- Sell HIMS put option [price: 0.3; quantity: 10] 
   (Portfolio Value: 10000; Short: 0; Long: 0; Cash: 10000; Free cash: 10000)

   
### Put option (sell)
- Sell HIMS put option [price: 0.30; quantity: 10]
   (Portfolio Value: 10000; Short: 300; Long: 0; Cash: 10300; Free cash: 10000)
- Buy back HIMS put option [price: 0.5; quantity: 10] 
   (Portfolio Value: 9800; Short: 0; Long: 0; Cash: 9800; Free cash: 9800)
- Sell HIMS put option [price: 0.5; quantity: 10]
   (Portfolio Value: 9800; Short: 500; Long: 0; Cash: 10300; Free cash: 9800)
- Buy back HIMS put option [price: 0.3; quantity: 10] 
   (Portfolio Value: 10000; Short: 0; Long: 0; Cash: 10000; Free cash: 10000)


## Spreads (to check)

### Call debit spread (buy)
- Buy HIMS call debit spread [price: 0.30; quantity: 10]
   (Portfolio Value: 10000; Short: 0; Long: 300; Cash: 9700; Free cash: 9700)
- Sell HIMS call debit spread [price: 0.5; quantity: 10] 
   (Portfolio Value: 10200; Short: 0; Long: 0; Cash: 10200; Free cash: 10200)
- Buy HIMS call debit spread [price: 0.5; quantity: 10]
   (Portfolio Value: 10200; Short: 0; Long: 500; Cash: 9700; Free cash: 9700)
- Sell HIMS call debit spread [price: 0.3; quantity: 10] 
   (Portfolio Value: 10000; Short: 0; Long: 0; Cash: 10000; Free cash: 10000)

### Call credit spread (sell)
- Sell HIMS call credit spread [price: 0.30; quantity: 10]
   (Portfolio Value: 10000; Short: 300; Long: 0; Cash: 10300; Free cash: 10000)
- Buy back HIMS call credit spread [price: 0.5; quantity: 10] 
   (Portfolio Value: 9800; Short: 0; Long: 0; Cash: 9800; Free cash: 9800)
- Sell HIMS call credit spread [price: 0.5; quantity: 10]
   (Portfolio Value: 9800; Short: 500; Long: 0; Cash: 10300; Free cash: 9800)
- Buy back HIMS call option [price: 0.3; quantity: 10] 
   (Portfolio Value: credit spread; Short: 0; Long: 0; Cash: 10000; Free cash: 10000)

   
### Put debit spread (buy)
- Buy HIMS put debit spread [price: 0.30; quantity: 10]
   (Portfolio Value: 10000; Short: 0; Long: 300; Cash: 9700; Free cash: 9700)
- Sell HIMS put debit spread [price: 0.5; quantity: 10] 
   (Portfolio Value: 10200; Short: 0; Long: 0; Cash: 10200; Free cash: 10200)
- Buy HIMS put debit spread [price: 0.5; quantity: 10]
   (Portfolio Value: 10200; Short: 0; Long: 500; Cash: 9700; Free cash: 9700)
- Sell HIMS put debit spread [price: 0.3; quantity: 10] 
   (Portfolio Value: 10000; Short: 0; Long: 0; Cash: 10000; Free cash: 10000)

   
### Put credit spread (sell)
- Sell HIMS put credit spread [price: 0.30; quantity: 10]
   (Portfolio Value: 10000; Short: 300; Long: 0; Cash: 10300; Free cash: 10000)
- Buy back HIMS put credit spread [price: 0.5; quantity: 10] 
   (Portfolio Value: 9800; Short: 0; Long: 0; Cash: 9800; Free cash: 9800)
- Sell HIMS put credit spread [price: 0.5; quantity: 10]
   (Portfolio Value: 9800; Short: 500; Long: 0; Cash: 10300; Free cash: 9800)
- Buy back HIMS put credit spread [price: 0.3; quantity: 10] 
   (Portfolio Value: 10000; Short: 0; Long: 0; Cash: 10000; Free cash: 10000)



# Trading rules scenario's

- Een aandeel stijgt of daalt met 10% (alert)
- Een optie heeft nog 7 dagen of minder tot expiratie (rode lijn + alert)
- Een short optie heeft al 80% van zijn waarde verloren en levert dus op (opportunity om te rollen)
- Een leaps optie heeft nog maar 3 maanden tot expiratie en gaat dus zijn leaps status verliezen (alert)
- Een leaps optie heeft geen covered call (opportunity)
- Een aandeel heeft 100 stuks, maar geen covered call (opportunity)
- De portefeuille heeft een tekort aan free cash (alert)
- De portefeuille heeft een overschot aan cash, meer dan 10k bv (opportunity)
- Een leaps optie is voorbij zijn break-even (opportunity)

   (trading rules - alerts )
   (spreads testen; trading rules testen)
   (simuleer prijsstijging/daling - en test alle scenarios opnieuw)
   (refactor)




spreads testen
alerts en opportunites


# C# WebSocket Backend voor PayDay Trading Application

## Overzicht

Maak een .NET 8 WebSocket backend die real-time prijzen streamt naar een React frontend trading applicatie. De backend moet:

1. Een WebSocket endpoint `/ws/prices` aanbieden
2. Subscribe/unsubscribe mechanisme voor tickers en opties ondersteunen
3. Mock prijsdata genereren (later te vervangen door echte market data feeds)
4. Prijzen broadcasten naar gesubscribeerde clients

## Technische Specificaties

### Framework & Dependencies
- .NET 8 Web API
- Native WebSocket support (geen SignalR nodig)
- JSON serialization met System.Text.Json

### WebSocket Endpoint
```
ws://localhost:5000/ws/prices
```

## Message Protocol

### Inkomende Messages (Client → Server)

#### Subscribe Tickers
```json
{
  "action": "subscribe",
  "channel": "tickers",
  "symbols": ["AAPL", "MSFT", "GOOGL"]
}
```

#### Subscribe Options
Opties worden individueel gesubscribed met alle identificerende kenmerken:
```json
{
  "action": "subscribe",
  "channel": "options",
  "options": [
    {
      "symbol": "AAPL",
      "strike": 190,
      "expiration": "2024-01-19",
      "optionType": "call"
    },
    {
      "symbol": "AAPL",
      "strike": 180,
      "expiration": "2024-01-19",
      "optionType": "put"
    }
  ]
}
```

#### Unsubscribe Tickers
```json
{
  "action": "unsubscribe",
  "channel": "tickers",
  "symbols": ["AAPL"]
}
```

```json
{
  "action": "unsubscribe",
  "channel": "tickers"
}
```
(zonder symbols = unsubscribe van alle tickers)

#### Unsubscribe Options
```json
{
  "action": "unsubscribe",
  "channel": "options",
  "options": [
    {
      "symbol": "AAPL",
      "strike": 190,
      "expiration": "2024-01-19",
      "optionType": "call"
    }
  ]
}
```

```json
{
  "action": "unsubscribe",
  "channel": "options"
}
```
(zonder options = unsubscribe van alle opties)

#### Set Data Mode
De client kan de data mode instellen om te bepalen hoe prijzen worden gegenereerd:
```json
{
  "action": "set_data_mode",
  "mode": "demo"
}
```

**Mogelijke modes:**
- `demo`: Handmatige modus - prijzen worden alleen bijgewerkt via externe simulator control (geen automatische updates)
- `demo-feed`: Gesimuleerde feed - backend genereert automatisch gesimuleerde prijsfluctuaties
- `live`: Live data - prijzen worden opgehaald van Interactive Brokers API

Bij connectie stuurt de client direct de gewenste data mode. De backend moet:
1. De mode opslaan per client sessie
2. Voor `demo-feed`: de `PriceGeneratorService` activeren voor die client
3. Voor `live`: connectie maken met IB API en echte prijzen streamen
4. Voor `demo`: geen automatische prijzen sturen (wacht op externe input)

### Uitgaande Messages (Server → Client)

#### Ticker Price Update
```json
{
  "type": "ticker_price",
  "symbol": "AAPL",
  "price": 185.50,
  "timestamp": "2024-01-15T14:30:00.000Z"
}
```

#### Option Price Update
```json
{
  "type": "option_price",
  "symbol": "AAPL",
  "strike": 190,
  "expiration": "2024-01-19",
  "optionType": "call",
  "premium": 3.25,
  "delta": 0.45,
  "timestamp": "2024-01-15T14:30:00.000Z"
}
```

**Velden:**
- `symbol`: Underlying ticker symbol
- `strike`: Strike price van de optie
- `expiration`: Expiratie datum (YYYY-MM-DD formaat)
- `optionType`: Moet exact `"call"` of `"put"` zijn (lowercase)
- `premium`: Huidige prijs per contract (niet * 100)
- `delta`: Delta waarde tussen -1 en 1
  - Calls: 0 tot 1 (ATM ≈ 0.50, deep ITM → 1, deep OTM → 0)
  - Puts: -1 tot 0 (ATM ≈ -0.50, deep ITM → -1, deep OTM → 0)
- `timestamp`: ISO 8601 timestamp

#### Connection Status
```json
{
  "type": "connection_status",
  "status": "connected",
  "message": "Successfully connected to price feed"
}
```

```json
{
  "type": "connection_status",
  "status": "subscribed",
  "message": "Subscribed to tickers: AAPL, MSFT"
}
```

```json
{
  "type": "connection_status",
  "status": "subscribed",
  "message": "Subscribed to 3 options"
}
```

#### Error Message
```json
{
  "type": "error",
  "message": "Invalid symbol: XYZ123",
  "code": "INVALID_SYMBOL"
}
```

## Architectuur

### Message Classes

```csharp
// Incoming messages
public record SubscribeMessage(
    string Action,
    string Channel,
    string[]? Symbols,
    OptionIdentifier[]? Options
);

public record OptionIdentifier(
    string Symbol,
    decimal Strike,
    string Expiration,  // "YYYY-MM-DD"
    string OptionType   // "call" or "put"
);

// Outgoing messages
public record TickerPriceMessage(
    string Type,      // "ticker_price"
    string Symbol,
    decimal Price,
    DateTime Timestamp
);

public record OptionPriceMessage(
    string Type,        // "option_price"
    string Symbol,
    decimal Strike,
    string Expiration,  // "YYYY-MM-DD"
    string OptionType,  // "call" or "put"
    decimal Premium,
    decimal Delta,      // -1 to 1
    DateTime Timestamp
);

public record ConnectionStatusMessage(
    string Type,    // "connection_status"
    string Status,  // "connected", "subscribed", "unsubscribed"
    string Message
);

public record ErrorMessage(
    string Type,    // "error"
    string Message,
    string? Code
);
```

### WebSocket Manager

Maak een `WebSocketManager` class die:
- Client connections bijhoudt
- Per-client subscriptions beheert (zowel tickers als specifieke opties)
- Messages naar de juiste clients routeert

```csharp
public class WebSocketManager
{
    private readonly ConcurrentDictionary<string, WebSocketClient> _clients = new();

    public async Task HandleConnectionAsync(WebSocket webSocket);
    public async Task BroadcastTickerPrice(string symbol, decimal price);
    public async Task BroadcastOptionPrice(OptionPriceMessage option);
}

public class WebSocketClient
{
    public string Id { get; }
    public WebSocket WebSocket { get; }
    public HashSet<string> SubscribedTickers { get; } = new();
    public HashSet<OptionIdentifier> SubscribedOptions { get; } = new();
    public SemaphoreSlim SendLock { get; } = new(1, 1);
}
```

### Price Generator Service

Maak een `PriceGeneratorService` als background service die:
- Mock prijzen genereert voor gesubscribeerde tickers
- Prijzen laat fluctueren (±0.5% per update)
- Updates stuurt elke 1-2 seconden

```csharp
public class PriceGeneratorService : BackgroundService
{
    private readonly WebSocketManager _wsManager;
    private readonly Dictionary<string, decimal> _currentPrices = new();

    // Base prices voor mock data
    private readonly Dictionary<string, decimal> _basePrices = new()
    {
        ["AAPL"] = 185.00m,
        ["MSFT"] = 375.00m,
        ["GOOGL"] = 140.00m,
        ["AMZN"] = 155.00m,
        ["NVDA"] = 495.00m,
        ["TSLA"] = 245.00m,
        ["META"] = 355.00m,
        ["SPY"] = 475.00m,
        ["QQQ"] = 400.00m,
        ["IWM"] = 195.00m,
        ["HIMS"] = 55.00m,
        ["PLTR"] = 65.00m,
        ["SOFI"] = 12.00m,
        ["AMD"] = 145.00m,
        ["INTC"] = 45.00m,
    };

    protected override async Task ExecuteAsync(CancellationToken stoppingToken);
}
```

### Option Price Generator

Voor opties moet je mock premiums EN delta genereren. Gebruik een vereenvoudigd Black-Scholes model:

```csharp
public class OptionPriceCalculator
{
    /// <summary>
    /// Bereken mock premium en delta voor een optie
    /// </summary>
    public (decimal premium, decimal delta) CalculateOptionPrice(
        decimal underlyingPrice,
        decimal strike,
        DateTime expiration,
        string optionType,
        decimal volatility = 0.30m  // 30% implied volatility default
    )
    {
        var daysToExpiry = (expiration - DateTime.Today).TotalDays;
        var timeToExpiry = (decimal)(daysToExpiry / 365.0);

        if (timeToExpiry <= 0)
        {
            // Expired option
            if (optionType == "call")
            {
                var intrinsic = Math.Max(0, underlyingPrice - strike);
                return (intrinsic, intrinsic > 0 ? 1m : 0m);
            }
            else
            {
                var intrinsic = Math.Max(0, strike - underlyingPrice);
                return (intrinsic, intrinsic > 0 ? -1m : 0m);
            }
        }

        // Simplified delta calculation
        var moneyness = underlyingPrice / strike;
        decimal delta;
        decimal timeValue;

        if (optionType == "call")
        {
            // Call delta: 0 (deep OTM) to 1 (deep ITM)
            delta = CalculateCallDelta(moneyness, timeToExpiry, volatility);
            var intrinsic = Math.Max(0, underlyingPrice - strike);
            timeValue = CalculateTimeValue(underlyingPrice, strike, timeToExpiry, volatility);
            return (intrinsic + timeValue, delta);
        }
        else
        {
            // Put delta: -1 (deep ITM) to 0 (deep OTM)
            delta = CalculateCallDelta(moneyness, timeToExpiry, volatility) - 1;
            var intrinsic = Math.Max(0, strike - underlyingPrice);
            timeValue = CalculateTimeValue(underlyingPrice, strike, timeToExpiry, volatility);
            return (intrinsic + timeValue, delta);
        }
    }

    private decimal CalculateCallDelta(decimal moneyness, decimal timeToExpiry, decimal volatility)
    {
        // Simplified: use logistic function as approximation
        // ATM (moneyness = 1) → delta ≈ 0.5
        // ITM (moneyness > 1) → delta → 1
        // OTM (moneyness < 1) → delta → 0
        var logMoneyness = (double)Math.Log(moneyness);
        var scaleFactor = (double)(volatility * (decimal)Math.Sqrt((double)timeToExpiry));
        if (scaleFactor < 0.01) scaleFactor = 0.01; // Prevent division by zero

        var d1 = logMoneyness / scaleFactor;
        // Use sigmoid approximation for N(d1)
        var delta = 1.0 / (1.0 + Math.Exp(-1.7 * d1));
        return (decimal)Math.Round(delta, 2);
    }

    private decimal CalculateTimeValue(decimal underlyingPrice, decimal strike, decimal timeToExpiry, decimal volatility)
    {
        // Simplified time value: higher for ATM, decays with time
        var atm = Math.Min(underlyingPrice, strike);
        var timeValueMax = atm * volatility * (decimal)Math.Sqrt((double)timeToExpiry);

        // Reduce time value for ITM/OTM options
        var moneyness = underlyingPrice / strike;
        var moneynessImpact = (decimal)Math.Exp(-Math.Pow((double)(moneyness - 1) * 5, 2));

        return Math.Round(timeValueMax * moneynessImpact, 2);
    }
}
```

## Program.cs Setup

```csharp
var builder = WebApplication.CreateBuilder(args);

// Add services
builder.Services.AddSingleton<WebSocketManager>();
builder.Services.AddSingleton<OptionPriceCalculator>();
builder.Services.AddHostedService<PriceGeneratorService>();

// CORS voor frontend
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.WithOrigins("http://localhost:3000", "http://localhost:5173")
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

var app = builder.Build();

app.UseCors();
app.UseWebSockets();

// WebSocket endpoint
app.Map("/ws/prices", async (HttpContext context, WebSocketManager wsManager) =>
{
    if (context.WebSockets.IsWebSocketRequest)
    {
        var webSocket = await context.WebSockets.AcceptWebSocketAsync();
        await wsManager.HandleConnectionAsync(webSocket);
    }
    else
    {
        context.Response.StatusCode = 400;
    }
});

app.Run();
```

## Belangrijke Implementatiedetails

### JSON Serialization
Gebruik camelCase voor JSON properties:
```csharp
var options = new JsonSerializerOptions
{
    PropertyNamingPolicy = JsonNamingPolicy.CamelCase
};
```

### OptionIdentifier Equality
Voor het tracken van gesubscribeerde opties moet je equality correct implementeren:
```csharp
public record OptionIdentifier(
    string Symbol,
    decimal Strike,
    string Expiration,
    string OptionType
)
{
    // Records hebben automatisch value equality
    // Maar normaliseer de data voor consistentie:
    public string NormalizedKey =>
        $"{Symbol.ToUpper()}_{Strike}_{Expiration}_{OptionType.ToLower()}";
}
```

### Error Handling
- Vang WebSocket disconnects netjes af
- Log errors maar crash niet de service
- Stuur error messages naar client bij ongeldige requests

### Thread Safety
- Gebruik `ConcurrentDictionary` voor client tracking
- Gebruik `SemaphoreSlim` per client voor WebSocket send operaties
- Lock subscriptions bij modificatie

### Graceful Shutdown
- Bij server shutdown, sluit alle WebSocket connections
- Stuur een disconnect message naar clients

## Test Scenario's

1. **Basic Connect**: Client connect → ontvang `connection_status` message
2. **Subscribe Tickers**: Subscribe to AAPL → ontvang price updates
3. **Multiple Tickers**: Subscribe to meerdere tickers → ontvang mixed updates
4. **Unsubscribe Ticker**: Unsubscribe van ticker → stop met ontvangen van updates
5. **Subscribe Options**: Subscribe to specifieke opties → ontvang option price updates met delta
6. **Unsubscribe Options**: Unsubscribe van specifieke optie → stop updates
7. **Reconnect**: Client disconnect en reconnect → alles werkt weer
8. **Invalid Symbol**: Subscribe to onbekende ticker → ontvang error message

## Frontend Integration

De React frontend verwacht exact deze message formats. De frontend:
- Connect naar `ws://localhost:5000/ws/prices`
- Stuurt subscribe/unsubscribe messages
- Dispatcht Redux actions bij ontvangen van prijzen:
  - `ticker_price` → `updateTickerPrice(symbol, price)`
  - `option_price` → `updateOptionPremium(symbol, strike, expiration, optionType, premium, delta)`

## Voorbeeld Flow

```
Client                              Server
   |                                   |
   |------ WebSocket Connect --------->|
   |<----- connection_status ----------|
   |                                   |
   |------ subscribe tickers --------->|
   |       ["AAPL", "MSFT"]            |
   |<----- connection_status ----------|
   |       "Subscribed to: AAPL, MSFT" |
   |                                   |
   |------ subscribe options --------->|
   |       [{AAPL, 190, 2024-01-19,    |
   |         call}]                    |
   |<----- connection_status ----------|
   |       "Subscribed to 1 option"    |
   |                                   |
   |<----- ticker_price ---------------|
   |       AAPL: $185.23               |
   |<----- option_price ---------------|
   |       AAPL 190C 01/19: $3.25      |
   |       delta: 0.42                 |
   |<----- ticker_price ---------------|
   |       MSFT: $374.89               |
   |       ...                         |
```

## Start Commando's

```bash
# Maak nieuw project
dotnet new webapi -n PayDay.PriceService
cd PayDay.PriceService

# Run
dotnet run

# Of met hot reload
dotnet watch run
```

De service moet draaien op `http://localhost:5000` (of configureerbaar via appsettings.json).

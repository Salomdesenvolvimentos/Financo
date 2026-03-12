'use client';

// ============================================
// Componente: CryptoTicker
// Letreiro de preços de criptomoedas via CoinGecko (API gratuita, sem chave)
// ============================================

import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';

interface CryptoPrice {
  id: string;
  symbol: string;
  name: string;
  brl: number;
  change24h: number;
}

const CRYPTO_LIST = [
  { id: 'bitcoin',   symbol: 'BTC', name: 'Bitcoin'  },
  { id: 'ethereum',  symbol: 'ETH', name: 'Ethereum' },
  { id: 'solana',    symbol: 'SOL', name: 'Solana'   },
  { id: 'ripple',    symbol: 'XRP', name: 'XRP'      },
  { id: 'cardano',   symbol: 'ADA', name: 'Cardano'  },
  { id: 'dogecoin',  symbol: 'DOGE', name: 'Dogecoin' },
  { id: 'binancecoin', symbol: 'BNB', name: 'BNB'    },
  { id: 'polkadot',  symbol: 'DOT', name: 'Polkadot' },
];

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 2 }).format(v);

export function CryptoTicker() {
  const [prices, setPrices]     = useState<CryptoPrice[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [show, setShow]         = useState(true);

  useEffect(() => {
    // Verificar preferência armazenada
    const stored = localStorage.getItem('show_crypto_ticker');
    if (stored === 'false') {
      setShow(false);
      setLoading(false);
      return;
    }

    const fetchPrices = async () => {
      try {
        const ids = CRYPTO_LIST.map(c => c.id).join(',');
        const res = await fetch(
          `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=brl&include_24hr_change=true`,
          { cache: 'no-store' }
        );
        if (!res.ok) throw new Error(`Status ${res.status}`);
        const data = await res.json();

        const result: CryptoPrice[] = CRYPTO_LIST
          .filter(c => data[c.id]?.brl)
          .map(c => ({
            id:       c.id,
            symbol:   c.symbol,
            name:     c.name,
            brl:      data[c.id].brl,
            change24h: data[c.id].brl_24h_change ?? 0,
          }));

        setPrices(result);
        setLastUpdate(new Date());
        setError(false);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchPrices();
    const interval = setInterval(fetchPrices, 120_000); // atualiza a cada 2 min
    return () => clearInterval(interval);
  }, []);

  if (!show || loading || error || prices.length === 0) return null;

  // Duplica lista para loop contínuo
  const items = [...prices, ...prices];

  return (
    <div className="relative w-full overflow-hidden rounded-xl border border-border bg-muted/40 dark:bg-muted/20 py-2">
      {/* Badge "AO VIVO" */}
      <div className="absolute left-3 top-1/2 -translate-y-1/2 z-10 flex items-center gap-1.5 bg-background/80 dark:bg-background/60 backdrop-blur-sm px-2 py-0.5 rounded-md border border-border">
        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Cripto</span>
      </div>

      {/* Ticker scrolling */}
      <div
        className="flex whitespace-nowrap animate-ticker-scroll"
        style={{ paddingLeft: '90px' }}
        onMouseEnter={e => ((e.currentTarget as HTMLElement).style.animationPlayState = 'paused')}
        onMouseLeave={e => ((e.currentTarget as HTMLElement).style.animationPlayState = 'running')}
      >
        {items.map((crypto, i) => {
          const up = crypto.change24h >= 0;
          return (
            <span key={`${crypto.id}-${i}`} className="inline-flex items-center gap-2 mx-6 text-sm">
              <span className="font-bold text-foreground">{crypto.symbol}</span>
              <span className="text-muted-foreground font-medium">{fmt(crypto.brl)}</span>
              <span className={`inline-flex items-center gap-0.5 text-xs font-semibold ${up ? 'text-green-500' : 'text-red-500'}`}>
                {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {Math.abs(crypto.change24h).toFixed(2)}%
              </span>
              <span className="text-muted-foreground/30 select-none">│</span>
            </span>
          );
        })}
      </div>

      {/* Última atualização */}
      {lastUpdate && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 bg-background/80 dark:bg-background/60 backdrop-blur-sm px-2 py-0.5 rounded-md border border-border">
          <RefreshCw className="h-2.5 w-2.5 text-muted-foreground" />
          <span className="text-[10px] text-muted-foreground">
            {lastUpdate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      )}
    </div>
  );
}

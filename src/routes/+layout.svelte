<script lang="ts">
	import '../app.css';
	import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query';
	import { env as publicEnv } from '$env/dynamic/public';
	import { defaultConfig } from 'svelte-wagmi';
	import { base } from '@wagmi/core/chains';
	import { injected, walletConnect } from '@wagmi/connectors';
	import { fallback, http, type Transport } from 'viem';
	import { onMount } from 'svelte';
	import { injectAnalytics } from '@vercel/analytics/sveltekit';
	import { injectSpeedInsights } from '@vercel/speed-insights/sveltekit';

	// Prefer dedicated / third-party RPCs; mainnet.base.org is last (strict 429 limits).
	//
	// Every endpoint here was probed for the two methods this app actually needs —
	// eth_getTransactionReceipt (claim confirmation) and eth_getLogs (claim history) —
	// rather than for mere liveness. Three previous entries were removed because they
	// cannot serve them:
	//   base-rpc.publicnode.com   eth_getTransactionReceipt -> HTTP 403, 0/8 success.
	//                             Free tier gates the method outright: a hash that does
	//                             not exist returns the same "Archive requests require a
	//                             personal token" error, so it never performs a lookup.
	//                             This was the primary RPC, so EVERY claim confirmation
	//                             began with a guaranteed failure.
	//   base.llamarpc.com         HTTP 521 — origin offline.
	//   base.meowrpc.com          "The method eth_getLogs is not supported."
	// base-mainnet.public.blastapi.io was dropped too: it serves receipts but rate-limits
	// eth_getLogs. The five below returned 8/8 on receipts (110–228ms p50).
	const rpcList = [
		publicEnv.PUBLIC_BASE_RPC_URL,
		"https://gateway.tenderly.co/public/base",
		"https://base-pokt.nodies.app",
		"https://base.drpc.org",
		"https://1rpc.io/base",
		"https://mainnet.base.org"
	].filter((url): url is string => typeof url === "string" && url.length > 0);

	const baseNetworkFallbackRpcs = {
		...base,
		rpcUrls: {
			...base.rpcUrls,
			default: { http: rpcList },
			public: { http: rpcList }
		}
	};


	const queryClient = new QueryClient({
		defaultOptions: {
			queries: {
				staleTime: Infinity
			}
		}
	});

	const initWallet = async () => {
		const PUBLIC_WALLETCONNECT_ID = publicEnv.PUBLIC_WALLETCONNECT_ID || '';
		
		// Create a fallback transport that automatically rotates through multiple RPCs
		// This provides resilience: if one RPC fails, viem automatically tries the next
		const rpcUrls = baseNetworkFallbackRpcs.rpcUrls.default.http;
		
		// No per-transport retries — let the outer fallback rotate to the next RPC
		// immediately on failure (e.g. 429) instead of hammering the same endpoint.
		const transports = rpcUrls.map((url, index) =>
			http(url, {
				name: `RPC-${index + 1}`,
				retryCount: 0,
				timeout: 15_000,
			})
		);

		// Fallback transport with aggressive rotation for resilience
		const transport = fallback(
			transports,
			{
				rank: {
					interval: 60_000, // Re-rank RPCs every 60 seconds
					sampleCount: 5,
					timeout: 2_000,
					weights: {
						latency: 0.2,
						stability: 0.8  // Prioritize stability over latency
					},
					// viem's default ranking probe is net_listening, which measures nothing
					// this app depends on and actively mis-ranked the pool: publicnode
					// answered it `true` in ~175ms and was pinned to the FRONT despite
					// failing every eth_getTransactionReceipt, while mainnet.base.org
					// answers it "rpc method is unsupported" (HTTP 403) and was scored a
					// failure and pinned to the BACK despite serving receipts 8/8.
					// With stability weighted 0.8 that ordering was self-reinforcing, so
					// reordering the list alone would have been undone within one interval.
					// eth_chainId is supported by every endpoint in the list.
					ping: ({ transport }) => transport.request({ method: 'eth_chainId' })
				},
				retryCount: 5  // Try up to 5 different RPCs before failing
			}
		);
		
		const erckit = defaultConfig({
			autoConnect: true,
			appName: 'base',
			walletConnectProjectId: PUBLIC_WALLETCONNECT_ID,
			chains: [baseNetworkFallbackRpcs],
			connectors: [injected(), walletConnect({ projectId: PUBLIC_WALLETCONNECT_ID })],
			transports: {
				[base.id]: transport
			}
		} as Parameters<typeof defaultConfig>[0] & {
			transports: Record<number, Transport>;
		});
		await erckit.init();
	};

	onMount(() => {
		initWallet();
		injectAnalytics();
		injectSpeedInsights();

		// MailerLite forms should now work with direct form submission

		return () => {
			document.body.style.overflow = '';
		};
	});
</script>

<svelte:head>
    <!-- MailerLite Form Scripts -->
    <script src="https://groot.mailerlite.com/js/w/webforms.min.js?v176e10baa5e7ed80d35ae235be3d5024"></script>
</svelte:head>

<QueryClientProvider client={queryClient}>
	<slot />
</QueryClientProvider>

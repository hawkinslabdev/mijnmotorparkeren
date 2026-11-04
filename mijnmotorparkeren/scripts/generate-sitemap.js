// scripts/generate-sitemap.js
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs/promises';
import { landingSlugs } from '../src/utils/indexable.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function readEntities(dir) {
    const files = (await fs.readdir(dir)).filter(f => f.endsWith('.json') && f !== 'index.json');
    return Promise.all(files.map(async f => JSON.parse(await fs.readFile(path.join(dir, f), 'utf-8'))));
}

const FALLBACK_LASTMOD = '2026-09-11';

// Fall back to newest source date
export function getLastmod(entity) {
    return entity.lastUpdated ?? entity.sources?.map(s => s.date).filter(Boolean).sort().at(-1);
}

async function getGemeenteAndCityIds() {
    // Dynamically load gemeente and city ids from data files
    const gemeentes = await readEntities(path.resolve(__dirname, '../data/gemeentes'));
    const cities = await readEntities(path.resolve(__dirname, '../data/city'));

    const lastmods = {};
    gemeentes.forEach(g => { lastmods[`/gemeente/${g.id}`] = getLastmod(g); });

    // Real gemeente files win
    const ids = new Set(gemeentes.map(g => g.id));
    const placeRoutes = gemeentes.flatMap(g => landingSlugs(g)
        .filter(slug => !ids.has(slug))
        .map(slug => {
            lastmods[`/gemeente/${slug}`] = getLastmod(g);
            return `/gemeente/${slug}`;
        }));
    cities.forEach(c => { lastmods[`/stad/${c.id}`] = c.lastUpdated; });

    return {
        gemeenteRoutes: [...gemeentes.map(g => `/gemeente/${g.id}`), ...placeRoutes],
        // FIX: Use /stad instead of /city to match router
        cityRoutes: cities.map(c => `/stad/${c.id}`),
        lastmods
    };
}

export function generateSitemap({ baseUrl, routes, lastmods = {} }) {
    const langOrder = [];
    
    // Don't process alternates or x-default when langOrder is empty
    const routesObj = routes.reduce((acc, route) => {
        acc[route] = langOrder.length > 0
            ? langOrder.map(lang => {
                const href = new URL(`${lang}${route}`, baseUrl).toString();
                return { hreflang: lang, href };
            }).concat({ hreflang: 'x-default', href: new URL(route, baseUrl).toString() })
            : [];
        return acc;
    }, {});

    let sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n';
    
    for (const route in routesObj) {
        if (routesObj.hasOwnProperty(route)) {
            sitemap += `  <url>\n    <loc>${new URL(route, baseUrl).toString()}</loc>\n`;
            
            // Add alternate language links if any
            routesObj[route].forEach(alt => {
                const attributes = Object.keys(alt).map(key => `${key}="${alt[key]}"`).join(' ');
                sitemap += `    <xhtml:link rel="alternate" ${attributes}/>\n`;
            });
            
            // Add changefreq and priority based on route type
            if (route === '/') {
                sitemap += '    <changefreq>weekly</changefreq>\n';
                sitemap += '    <priority>1.0</priority>\n';
            } else if (route.startsWith('/gemeente/')) {
                sitemap += '    <changefreq>monthly</changefreq>\n';
                sitemap += '    <priority>0.8</priority>\n';
            } else if (route.startsWith('/stad/')) { // FIX: Use /stad pattern
                sitemap += '    <changefreq>weekly</changefreq>\n';
                sitemap += '    <priority>0.6</priority>\n'; // Higher priority for cities
            } else {
                sitemap += '    <changefreq>weekly</changefreq>\n';
                sitemap += '    <priority>0.5</priority>\n';
            }
            
            // Add lastmod for better crawling
            sitemap += `    <lastmod>${lastmods[route] ?? FALLBACK_LASTMOD}</lastmod>\n`;
            sitemap += '  </url>\n';
        }
    }
    
    sitemap += '</urlset>';
    return sitemap;
}

// Enhanced error handling and logging
if (process.argv[1] === __filename) (async () => {
    try {
        const baseUrl = 'https://mijnmotorparkeren.nl';
        console.log('🔧 Generating sitemap...');
        
        const { gemeenteRoutes, cityRoutes, lastmods } = await getGemeenteAndCityIds();
        console.log(`Found ${gemeenteRoutes.length} gemeente routes`);
        console.log(`Found ${cityRoutes.length} city routes`);
        
        const allRoutes = ['/', ...gemeenteRoutes, ...cityRoutes];
        console.log(`📋 Total routes: ${allRoutes.length}`);
        
        const sitemap = generateSitemap({ baseUrl, routes: allRoutes, lastmods });
        
        // Write to dist/client directory (Astro's static file output)
        const outputPath = path.resolve(__dirname, '../dist/client/sitemap.xml');
        await fs.mkdir(path.dirname(outputPath), { recursive: true });
        await fs.writeFile(outputPath, sitemap);
        
        // Also copy to public directory for development
        const publicPath = path.resolve(__dirname, '../public/sitemap.xml');
        await fs.mkdir(path.dirname(publicPath), { recursive: true });
        await fs.writeFile(publicPath, sitemap);
        
        console.log('✅ Sitemap generated successfully!');
        console.log(`📁 Output: ${outputPath}`);
        console.log(`📁 Public: ${publicPath}`);
        
        // Verify sample URLs
        console.log('\n🔍 Sample routes generated:');
        allRoutes.slice(0, 5).forEach(route => {
            console.log(`  ${baseUrl}${route}`);
        });
        
    } catch (error) {
        console.error('Error generating sitemap:', error);
        process.exit(1);
    }
})();
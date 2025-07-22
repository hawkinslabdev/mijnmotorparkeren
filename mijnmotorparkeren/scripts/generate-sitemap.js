// scripts/generate-sitemap.js
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getGemeenteAndCityIds() {
    // Dynamically load gemeente and city ids from data files
    const gemeenteDir = path.resolve(__dirname, '../data/gemeentes');
    const cityDir = path.resolve(__dirname, '../data/city');
    return Promise.all([
        fs.readdir(gemeenteDir),
        fs.readdir(cityDir)
    ]).then(([gemeenteFiles, cityFiles]) => {
        const gemeenteIds = gemeenteFiles
            .filter(f => f.endsWith('.json') && f !== 'index.json')
            .map(f => f.replace('.json', ''));
        
        const cityIds = cityFiles
            .filter(f => f.endsWith('.json') && f !== 'index.json')
            .map(f => f.replace('.json', ''));
        
        return {
            gemeenteRoutes: gemeenteIds.map(id => `/gemeente/${id}`),
            // FIX: Use /stad instead of /city to match router
            cityRoutes: cityIds.map(id => `/stad/${id}`)
        };
    });
}

function generateSitemap({ baseUrl, routes }) {
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
            sitemap += `    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>\n`;
            sitemap += '  </url>\n';
        }
    }
    
    sitemap += '</urlset>';
    return sitemap;
}

// Enhanced error handling and logging
(async () => {
    try {
        const baseUrl = 'https://mijnmotorparkeren.nl';
        console.log('🔧 Generating sitemap...');
        
        const { gemeenteRoutes, cityRoutes } = await getGemeenteAndCityIds();
        console.log(`📍 Found ${gemeenteRoutes.length} gemeente routes`);
        console.log(`🏙️ Found ${cityRoutes.length} city routes`);
        
        const allRoutes = ['/', ...gemeenteRoutes, ...cityRoutes];
        console.log(`📋 Total routes: ${allRoutes.length}`);
        
        const sitemap = generateSitemap({ baseUrl, routes: allRoutes });
        
        // Write to dist directory
        const outputPath = path.resolve(__dirname, '../dist/sitemap.xml');
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
        console.error('❌ Error generating sitemap:', error);
        process.exit(1);
    }
})();
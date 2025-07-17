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
        const gemeenteIds = gemeenteFiles.filter(f => f.endsWith('.json') && f !== 'index.json').map(f => f.replace('.json', ''));
        const cityIds = cityFiles.filter(f => f.endsWith('.json') && f !== 'index.json').map(f => f.replace('.json', ''));
        return {
            gemeenteRoutes: gemeenteIds.map(id => `/gemeente/${id}`),
            cityRoutes: cityIds.map(id => `/city/${id}`)
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
            routesObj[route].forEach(alt => {
                const attributes = Object.keys(alt).map(key => `${key}="${alt[key]}"`).join(' ');
                sitemap += `    <xhtml:link rel="alternate" ${attributes}/>\n`;
            });
            // Add changefreq and priority
            if (route === '/') {
                sitemap += '    <changefreq>weekly</changefreq>\n';
                sitemap += '    <priority>1.0</priority>\n';
            } else if (route.startsWith('/gemeente/')) {
                sitemap += '    <changefreq>monthly</changefreq>\n';
                sitemap += '    <priority>0.8</priority>\n';
            } else if (route.startsWith('/city/')) {
                sitemap += '    <changefreq>weekly</changefreq>\n';
                sitemap += '    <priority>0.5</priority>\n';
            } else {
                sitemap += '    <changefreq>weekly</changefreq>\n';
                sitemap += '    <priority>0.5</priority>\n';
            }
            sitemap += '  </url>\n';
        }
    }
    sitemap += '</urlset>';
    return sitemap;
}

(async () => {
    const baseUrl = 'https://mijnmotorparkeren.nl';
    const { gemeenteRoutes, cityRoutes } = await getGemeenteAndCityIds();
    const allRoutes = ['/', ...gemeenteRoutes, ...cityRoutes];
    const sitemap = generateSitemap({ baseUrl, routes: allRoutes });
    const outputPath = path.resolve(__dirname, '../dist/sitemap.xml');
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, sitemap);
    // Also copy to public/
    const publicPath = path.resolve(__dirname, '../public/sitemap.xml');
    await fs.mkdir(path.dirname(publicPath), { recursive: true });
    await fs.writeFile(publicPath, sitemap);
    console.log('Sitemap generated at', outputPath, 'and copied to', publicPath);
})();

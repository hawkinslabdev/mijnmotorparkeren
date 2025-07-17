# Use nginx to serve the static files
FROM nginx:alpine

# Copy the built files to nginx html directory
COPY dist/ /usr/share/nginx/html/

# Copy the public directory to nginx html directory (for static files like sitemap.xml)
COPY public/ /usr/share/nginx/html/

# Copy the data directory to nginx html directory so it's accessible via HTTP
COPY data/ /usr/share/nginx/html/data/

# Copy custom nginx configuration if needed
# COPY nginx.conf /etc/nginx/nginx.conf

# Expose port 80
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
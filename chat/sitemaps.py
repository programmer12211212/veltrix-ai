from django.contrib.sitemaps import Sitemap
from django.urls import reverse


class PublicPagesSitemap(Sitemap):
    changefreq = "weekly"
    priority = 0.8
    protocol = "https"

    def items(self):
        return ["landing", "login", "register"]

    def priority(self, item):
        if item == "landing":
            return 1.0
        return 0.7

    def location(self, item):
        return reverse(item)

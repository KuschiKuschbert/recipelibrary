# Riviera recipe expansion — technique references (public)

House recipes in `riviera_data/builtins.json` are **original prep-chef specs**. Use these links only for **ratio / temperature / technique** cross-checks when refining yields or troubleshooting — do not copy proprietary text.

## General technique

- [Serious Eats — The Food Lab](https://www.seriouseats.com/the-food-lab) — braise, sear, starch, emulsion concepts  
- [USDA — Safe minimum internal temperatures](https://www.fsis.usda.gov/food-safety/safe-temperature-chart) — protein temps (cross-check with house policy)  
- [Food Standards Australia New Zealand — food safety](https://www.foodstandards.gov.au/consumer/generalissues/foodsafety) — cold chain / events context  

## By dish class (waves A–D)

| Class | Example built-in ids | Suggested reading |
|-------|----------------------|-------------------|
| Beef sear / rare slices | `bruschetta-rare-roast-beef`, `fillet-beef-tempranillo` | Reverse-sear / resting guides on Serious Eats beef topics |
| Braise / red wine | `beef-bourguignon` | Classic bourguignon technique (public summaries); reduce wine before stock |
| Lamb roast | `greek-spiced-roast-lamb`, `lamb-shoulder-provencale-composed` | Low-and-slow shoulder breakdowns; Greek marinade ratios |
| Potato gratin | `creamy-potato-gratin` | Cream ratio, mandolin safety, rest before portion |
| Béchamel / gratin veg | `broccoli-cauliflower-gratin` | Roux with GF cornflour cookout time |
| Oysters raw | `natural-oysters-champagne-mignonette` | Mignonette ratios; shucking HACCP from your local authority |
| Brioche sliders | `*-brioche-slider` | Slider patty weight vs bun size; hold time limits |
| Couscous / harissa yoghurt | `lamb-shoulder-provencale-composed` | Couscous hydration; harissa heat by brand |
| Platters / boxes | `grazing-box-standard`, `platter-*` | Assembly order (wet vs dry); allergen labelling |
| Corporate bowls | `corporate-*-bowl` | Dress-to-order to avoid wilt; cold chain |
| Wave D buffet / salads / kids | `chilli-garlic-prawns-chorizo-rocket`, `greek-style-pulled-beef-buffet`, `corporate-pesto-pasta-salad`, `kids-spaghetti-bolognese`, `funeral-mixed-hot-nibbles-box` | Buffet hold times; pasta salad dressing split; mild kids ragu |

## Updating this file

When you add a new wave in `scripts/riviera_expansion_recipes_data.py`, append a row or short paragraph here so the team knows where to look for **science**, not for copy-paste recipes.

# Stage 2 re-tag — grade-levels diff (review before applying)

Grade levels are a user-facing filter. The re-tagging run re-derives them from each lesson body (the grades the lesson itself claims). Nothing has been changed in the database yet — this is a preview.

**Safety rule (grade guard):** when the run found NO grade for a lesson, the apply writes nothing for that lesson’s grades — the existing value is kept, never blanked. Those rows are listed at the bottom for transparency.

Summary: **132** grade changes written, **596** written unchanged (already matched), **25** preserved (no grade in the run → kept as-is).

## Grade changes (132)

These lessons get a new set of grade levels. Check the new grades match the lesson.

- **Kitchen Tool Identification Game** (`18aRAD5iY1YxcaqTUZBhflNDAstEAHumK`): K, 1, 2 → 6, 7, 8
- **Sensory Scavenger Hunt and** (`lesson_df09326b3497429cad55727f6d59d477`): PK, K, 1, 2 → 3K, PK, K, 1, 2
- **Making Potting Soil (5th Grade)** (`0B25CqYCC7Ofbc1Z3X1Y1cVZFenM`): 4, 5 → 5
- **Making Potting Soil (3rd Grade)** (`0B25CqYCC7OfbdE5tczBRUFoyS2c`): 3 → 3, 5
- **Human Habitat** (`0BwC8Pf3ZwAXjcm9MR3JaaHgxOVk`): PK → PK, K
- **Thanksgiving in the Garden** (`0BxEc0RZeYtCicXRsbXUyaDNKSEU`): 4 → 3, 4
- **Staple Foods: Amaranth** (`0BzCUl-9h7sgEVHdwcE9LZlJxRXM`): 3, 5, 6 → 3, 5
- **Primavera Pasta & Citrus Lemonade** (`1-MsjoyBLbpfMuiJtecJMApM-NctLHc5qup0i1w4ZC7A`): 1, 2, 3, 3K, 4, 5, K, PK → 3K, PK, K, 1, 2, 3, 4, 5, 6, 7, 8
- **Hummus** (`11ItiMGkBnyCYE13EhzVmUCMSeYivseKkcDcfe-26UEw`): 1, 2, 3, 3K, 4, 5, K, PK → 3K, PK, K, 1, 2
- **Food Miles** (`11WKWZvHkycA5yOZQcRaCViwyoMSGUS9sve64q77T5E0`): 4, 6, 7, 8 → 6, 7, 8
- **Parts of a Plant** (`11zvB7FSc-Z41_BSf3zh_Kc17TZhZK3lb`): 1, PK → 1
- **Crunchy Noodle and Tofu Salad** (`127RLjTEXNBru8mi_iAT-UDLIABOfEtJT3EYFAlK7hn8`): K, 1, 2, 3, 4, 5, 6, 7, 8 → 3K, PK, K, 1, 2, 3, 4, 5, 6, 7, 8
- **In the Garden with Dr. Carver** (`13biNspAVeUukqY_WNu7jN4CQKydttOt7OR85dnY3EFw`): 1, 2, 3K, K, PK → K
- **Mural Painting 101: Beautifying the Garden** (`13jE3-XsWBgxZpiSFB0MDFxur3HGv_zAxqzstYDhhuaI`): K, 1, 2, 3, 4, 5 → 3K, PK, K, 1, 2, 3, 4, 5, 6, 7, 8
- **Sukuma Wiki** (`13wZWpVxLu5wuquuOugOCJf0Z9oRerMo9Af9pV1P5mAM`): 3, 4, 5, 6, 7, 8 → 3K, PK, K, 1, 2, 3, 4, 5, 6, 7, 8
- **Carbon Footprint/ Black Bean Tacos** (`14JtnclwiZhMFr_MxwL9pK9D1StoyIhElXZUZX-sngKI`): 3K, PK, K, 1, 2, 3, 4, 5 → 3K, PK, K, 1, 2, 3, 4, 5, 6, 7, 8
- **Black Eyed Peas, the South and BHM** (`14wTm_zkFDwSqkUBJj01zdY2Lq1D6-eXdj6BQcZwOrQ4`): K, 1, 2, 3, 4, 5 → K, 1, 2, 4
- **Worm Breakfast Recipe** (`17y_7ZaHUNVntuTL9Nkzm7rFHewK4UVcL_DPeSRcWk0c`): PK, K, 1, 2 → K, 1
- **Gingerbread Cookies** (`181lWTGhtMXpO95d3JOAiPYXQe963z_Ru5Ibpvc9kbrE`): 1, 2, 3, 4, 5, K → 2, 3, 4, 5
- **Zahawig** (`188Ph9s6OEdUgNQScQOxGiqAtvNd2r78X`): 3, 4, 5, 6, 7, 8 → 3K, PK, K, 1, 2, 3, 4, 5, 6, 7, 8
- **Breakfast around the World / Israeli Salad (Intro to Global Unit)** (`18oKyXzj8zydRDEtQvZ68USr144_9vfMJhckXNo6NFVk`): K, 1, 2, 3, 4, 5, 6, 7, 8 → 3K, PK, K, 1, 2, 3, 4, 5, 6, 7, 8
- **Plantain Chips with Jerk Seasoning** (`1acXts_8377ebZE3ijwRcLTEhEhp9ZPqWJOqmub1mdug`): 3, 4, 5, 6, 7, 8, K, 1, 2 → 3K, PK, K, 1, 2, 3, 4, 5, 6, 7, 8
- **Farm Workers & Pesticides** (`1B-4jTGPsOXmFJp-q-4JpMJ3e7Qw5I92aOxtgWHD6UNU`): 4 → 4, 5
- **Plant Part Pizza** (`1BnZIwKhSFIwFKDh42fswHirPQQMxrwJyun1thD4Cc8Y`): K, 1, 2, 3, 4, 5, 6, 7, 8, PK, 3K → K, 1, 2, 3, 4, 5
- **Plants and Music** (`1CAKF0L0SYp5fgaXqZrrb4G-K3LzOu56phWV9JFg67U8`): 3, 4, 5 → K, 1, 2, 3, 4, 5
- **Leaf Collecting** (`1CE324nZDL2kz_4P5TwDuvoX7Zx_NMwUz`): PK, K, 1 → 3K, PK, K, 1
- **Informational Writing - Topics/Subtopics** (`1cH_8eRYyGYLfAMROmDowd8aPddx1tDMoUxTM0QBR42s`): 2, 3, 4, 5 → 6, 7, 8
- **Red Foods for Juneteenth** (`1Cj-iXBv_-EE4blTLhBngUNjYtsSUUTFWcXTRRTXOLD8`): 3, 4, 5, 6, 7, 8 → 3K, PK, K, 1, 2, 3, 4, 5, 6, 7, 8
- **Elementary Haudenosaunee Address Lesson** (`1CJ1G4KSQHYTmQp3DJjDuYrZeSlVx3IYmCNJGYV-oqiQ`): 3 → 3K, PK, K, 1, 2, 3, 4, 5
- **Insect Detectives** (`1cOoL_f4KW083IAnhyCyo0RUXNXnZQ-LvhShNpuD917k`): K, 1, 2, 3, 4, 5 → 3K, PK, K, 1, 2, 3, 4, 5
- **Growing Indoor Edible Sprouts** (`1cwCnyYH_67kVHNbgkbcP0UmGn7vjRenOyndkaR1r1SU`): 2, 3, 4, 5 → K, 1, 2, 3, 4, 5
- **Sandwich Swap (Mobile Education)** (`1d8eP6UrO-PNjP6cnlbrRjUCIeaNHdFXTd-ANOM5XgAA`): K, 1, 2, 3, 4, 5, 6, 7, 8 → 3K, PK, K, 1, 2, 3, 4, 5, 6, 7, 8
- **All About Compost** (`1Dkx1Q--fGzGDCAu3kx5OTsuRa_lRY2agdiMqyfn2VpI`): 3K, PK, K, 1, 2 → 3K, PK, 1, 2, 3, 4, 5
- **Fattoush** (`1Dz-Jv4cV0N0ntxZ8z0VcRgenI0hpZuOIDJuPbEvr7bI`): K, 1, 2, 3, 4, 5, 6, 7, 8, PK, 3K → K, 1, 2, 3, 4, 5
- **Leaves** (`1e2x4myJc1qh9eMb34iLam2FRuVzsJu3z5hpzlI2YACk`): 3K, K, PK → PK
- **Dr. Carver Lotion-Making** (`1EeGQSd0L2YohAapYIjqZy9tT2EK0cEXVU6ugltSaNwg`): K, 1, 2, 3, 4, 5 → 3K, PK, K, 1, 2, 3, 4, 5
- **Winter Fruit Salad (Seasonality)** (`1EPkNrvYIN_1pGe7zRjikBwIo2FcfNVxa3QADs26qYf8`): K, 1, 2, 3, 4, 5, 6, 7, 8 → K, 1, 2, 3, 4, 5
- **Welcome to the Garden** (`1eqwPqe-b3yL59iy8tBSWyxwM1cDoIyNURl6mpuiTews`): K, 1, 2 → 4, 5
- **Edmond Albius and the Story of Vanilla** (`1fHAR1HOSD0CTmyQkbhR8zTNwhAWfcnJn`): 4, 5, 6, 7, 8 → 3K, PK, K, 1, 2, 3, 4, 5
- **Three Sisters Tacos** (`1fNjAzV9JZhGsVCvQZui8jtoSfcSBEiNkU9yhTg55lEQ`): 1, 2, 3, 4, 5, 6, 7, 8, K, PK → 6, 7, 8
- **Interconnection & Native American Traditions** (`1g1_hRDipt9_3YcSS2hka46gNwsuVo1sd`): 4 → 4, 5
- **Following a Recipe** (`1Gcf-dU46Vol7h6iPF0YK7nhG4Aai0wu582DeX3mfy8A`): 6, 7 → 6, 7, 8
- **Fry Bread & Stories** (`1ggAWmeMm2AZoGXadfQjPzKMgZcYbTOyCiqUXdf0ZWrk`): K, 1, 2, 3, 4, 5 → PK, K, 1, 2, 3, 4, 5
- **Potato Exploration** (`1gr1mOTpvK0-t559hYZyGsQ4nnRlHC4Zk0uXQHgkqutg`): 3K, PK, K, 1 → 3K, PK, K, 1, 2, 3, 4, 5
- **Bug Camouflage** (`1gTwAkYvbhfAUBntDtseYQVv4QwljBG6NhuJSbzjfyFA`): 2, 3 → K, 1, 2, 3
- **Agar Jelly - K** (`1hUNwNfHVudR9tl-UZ8wPn9dKB9h7t33l`): K → K, 6, 7, 8
- **Applesauce** (`1hwLrvv9CUTx2rw2UMTDhqmLXQTd0hEsxan3HvNpPwa8`): 3K, PK, K, 1 → 3K, PK, K, 1, 2, 3
- **Plant Part Salad** (`1I-62V3w_VT2EycS03QXR-YiX_xe9xTwo10JHBk8o3vs`): 1, 2, 3, 4, 5, 6, 7, 8, K, PK → K, 1, 2, 3, 4, 5
- **Borscht** (`1i-jRBvEt7y6JAIeoiGDsX7J75sok1BV4BXZbD-vYlp4`): 1, 2, 3, 3K, 4, 5, K, PK → K, 1, 2, 3, 4, 5
- **Harvest and Weigh** (`1IHvZCWETI83NFCVhWAB57sE_cSvc4txycBQtaDzS8cA`): 1, K → K
- **2nd Grade Decomposition Experiment Part 1** (`1J2HY5aTORYqL2MLI96g-357msUdFSq82SlqE2PHsUl4`): 2 → 2, 3
- **Black Bean Dip (Mobile Education)** (`1j7ptyI-On9NHUejvvovsaT_2IZexwUxW29WqtCr63bM`): K, 1, 2, 3, 4, 5, 6, 7, 8 → 3K, PK, K, 1, 2, 3, 4, 5, 6, 7, 8
- **Sunny Honey Seed Snack** (`1jAvh1PUCB8D-6lYXy14ovAf10BwSdEme9SdkuEKnVx8`): 3K, PK, K, 1, 2, 3, 4, 5 → 3K, PK, K, 1, 2, 3, 4, 5, 6, 7, 8
- **Breakfast Banana Splits** (`1joU-vfs5M2OzCfgi6MXSVcJP-DM4Bs6gsdDvKwT6ZwI`): K, 1, 2, 3, 4, 5, 6, 7, 8 → 3K, PK, K, 1, 2, 3, 4, 5, 6, 7, 8
- **Cooking with Seeds: Ful Medames** (`1JYc3BYK-ZbYBcYQSUPKrFR3ocLhjnBRiFXFj3EV3CmE`): K, 1, 2, 3, 4, 5, 6, 7, 8 → 3K, PK, K, 1, 2, 3, 4, 5, 6, 7, 8
- **Meet The Food System** (`1K1tlc3--Dv061Qi1A1AKOGW6_L19VXSTRtKHfe73bjY`): 6, 7 → 6, 7, 8
- **Ful Medames** (`1K8JBnS7hTldpcB-f0CkDK94yYJyr_7r0itLDL3IOz4U`): 3, 4, 5, 6, 7, 8 → 3K, PK, K, 1, 2, 3, 4, 5, 6, 7, 8
- **Winter Fruit Salad (Mobile Education)** (`1kgvrmzkZ7o81URjqGwoq1DK0VicdTIHfvtXEvvmfxK8`): K, 1, 2, 3, 4, 5, 6, 7, 8 → 3K, PK, K, 1, 2, 3, 4, 5, 6, 7, 8
- **Measurement Hunt** (`1KPiyGcL_qXu_GkJc8VE_Qlh-y7dnvhlrd7YhJd5g2wM`): 2 → 2, 3
- **Go, Grow, Glow Grain Salad** (`1kSBxM0_MYqMQwXCRrSVD8_IB_g4kBfAuob2wBFK-HGs`): K, 1, 2, 3, 4, 5, 6, 7, 8 → 3K, PK, K, 1, 2, 3, 4, 5, 6, 7, 8
- **We All Need Trees** (`1m7CtCXCZkrBWfZ6PHtz634y2leOE9EXY`): 1, 2, 3, 4, 5 → 3K, PK, K, 1, 2, 3, 4, 5
- **Food Origins Scavenger Hunt** (`1NOdSZ-CDqH0fSefvjehIZKXB_6FM0T3S`): 4 → 4, 5
- **Five Senses Scavenger Hunt** (`1nzZC51049bxqfXYRxWX5Z-TwEL-8uS4H1nbWX7cgPFk`): 1, 2, 3K, K, PK → 3K, PK, K
- **Bundle Dyeing with Natural Materials** (`1O7WTJRysoioN-XhTfyFPEbfZ16uS89g9MxBaua0oZTc`): K, 1, 2, 3, 4, 5, 6, 7, 8 → 3K, PK, K, 1, 2, 3, 4, 5, 6, 7, 8
- **Yogurt Pumpkin Pie Dip Lesson Plan** (`1od60tIV946wEuiJR73BwGUnIikWriOZkPZNnBHzawoE`): K, 1, 2, 3 → PK, K, 1
- **Garlic Bread and Planting** (`1OLfezTbT0voh-Km85VIkJiuOmhju7CiF9kGSKb8JnXs`): K, 1, 2, 3, 4, 5, 6, 7, 8 → 3K, PK, K, 1, 2, 3, 4, 5, 6, 7, 8
- **3-5 Garden Tasks** (`1olvVADiZt-jO3KhD72MhfPNSmiqPG95iPlrgRbsS63I`): 3, 4, 5 → 3K, PK
- **Tzatziki (Mobile Education)** (`1pcHIE8XKH0K4P0VkCFcpi-cAPiMqepljmPxYllnXYjU`): K, 1, 2, 3, 4, 5, 6, 7, 8 → 3K, PK, K, 1, 2, 3, 4, 5, 6, 7, 8
- **Food Memories** (`1pIcyAiQqaFTZTDsU6TR5G3sRyo_EmsVH`): 1, 2, 3, 4, 5, 6, 7, 8, K → 6, 7, 8
- **Tastes Around the World** (`1puemyxDt0Cy3w5acFa9bjZGdfWEsZLs5`): K, 1, 2, 3 → 6
- **The Mighty Monarch** (`1qFdSvp0F1MJoBxkfucvjTayzGwuMjPRF`): K, 1, 2, 3, 4, 5, 6, 7, 8 → 3K, PK, K, 1, 2, 3, 4, 5, 6, 7, 8
- **K-2 Garden Tasks** (`1QfQnwMEhSLMwZ64WgW6MVG6aAX1o5ii_XkxLobFUrns`): K, 1, 2 → 3K, PK, K, 1, 2
- **Food Preservation** (`1QLiWw08Qi5CSB6uMwwm27WDgMNG-LMhtqOu6z85VRkk`): 1, 2, 3, 4, 5, K → 4, 5
- **Diary of A Worm** (`1qOAiHnYteeSZZKHAqW9c5z1YlbLQqGRlWZIW3KQ4Vss`): 1, 3K, PK → 3K, PK
- **Food Web** (`1quejMyRwvd1YerJBW09hzoaiFmkmrDPN`): 1, 3 → 1
- **Za'atar with Roasted Potatoes** (`1RcuAcHgStjdTUlodk5Lq8Yg3QH2UHmXAPL5uzKwHekk`): 3, 4, 5, 6, 7, 8 → 3K, PK, K, 1, 2, 3, 4, 5, 6, 7, 8
- **Corn Celebration** (`1t6oKO1wyQjRdVqTRsp-aKNfQ-vEL87LwZWNfNqwej6Y`): PK, K, 1, 2, 3, 4, 5, 6, 7, 8 → 3K, PK, K, 1, 2, 3, 4, 5
- **Red Drinks for Juneteenth** (`1TNen8KVizYd-al0B8XTA9wY-3s5O6Rm8aJQDWPhpz7k`): 3, 4, 5, 6, 7, 8 → 3K, PK, K, 1, 2, 3, 4, 5, 6, 7, 8
- **Food Miles Game** (`1tVWgHidAxvsPRMW2aJXd6YcFP9w0kbK6uOj_nbpu-KM`): 4, 5 → 4
- **2nd Grade Decomposition Experiment Part 2** (`1UCyriRP14jUWMetMP6Olivo6XTS3COl14Et8dtpmkPs`): 2 → 2, 3
- **Lunar New Year and Vegetable Dumplings** (`1uORjUwtJm3Ske0tI3UmZ7RG-IkfsN7v_`): PK, K, 1, 2, 3, 4, 5, 6, 7, 8 → 3K, PK, K, 1, 2, 3, 4, 5, 6, 7, 8
- **Sri Lankan Curry** (`1V7feFPt6bZc0b695g_3Qe_U4AAE-xO5s`): 1, 2, 3, 4, 5, 6, 7, 8, K → 3K, PK, K, 1, 2, 3, 4, 5, 6, 7, 8
- **Fattoush** (`1vDebvrcoPdDcoooLnpF64P3ade4l8ZRqVkfSlEAyYts`): K, 1, 2, 3, 4, 5, 6, 7, 8, PK, 3K → K, 1, 2, 3, 4, 5
- **Sweet and Sour Roots** (`1vFSTeTtZWM-xc7mUfvEclO1YCmIMiqR8`): PK, K, 1, 2, 3, 4, 5, 6, 7, 8 → PK, K, 1, 2, 3, 4, 5
- **Arroz con Gandules / Apple Jicama Slaw** (`1VShcRmcQCpjPrrltCpytiHeuAgHuIb311EOIoSctnmU`): K, 1, 2, 3, 4, 5, 6, 7, 8, PK, 3K → K, 1, 2, 3, 4, 5
- **AAPI Heritage Month - Philippines & Lumpia** (`1vtacAdf80q9FyZ4dEEzWmVLdycRmgJ7_MSRbrweoGwA`): K, 1, 2, 3, 4, 5, 6, 7, 8 → 3K, PK, K, 1, 2, 3, 4, 5, 6, 7, 8
- **Pea Shoot Pesto** (`1vWVxLn3As7yLJ7EVQUE1T4kXN3cVfUJKQw3kgFkqBV4`): K, 1, 2, 3, 4, 5, 6, 7, 8 → PK, K, 1, 2, 3, 4, 5, 6, 7, 8
- **Butterflies** (`1WKXLADkrfgZ7462f3JKfHNV-trHtuNtmo3i6Gq-PqeA`): 3K, PK → 3K, PK, K, 1
- **Guyanese Curried Chickpeas** (`1wpDTMqhkTxV7LpJJDgy8iU_O6ksZJDjFetoDderTIQA`): 1, 2, 5 → K, 1, 2, 5
- **Roly Polys** (`1wS7hhLPp7jv1mvZyeSjfCXHBp84k6UA6ONcoEyYk0DM`): K, 1, 2, 3, 4, 5 → 3K, PK, K, 1, 2, 3, 4, 5
- **Black Bean Dip** (`1wtaD7v9DlOho2r9pN6X1e5bOAFjncLlDw_qeQHXfjrg`): K, 1, 2, 3, 4, 5, 6, 7, 8 → 3K, PK, K, 1, 2, 3, 4, 5, 6, 7, 8
- **Yemeni Shakshuka** (`1x4iNndIGdwuqZuIkMc9-iDkHsc7lA-Y8dG9nptzZKs8`): PK, K, 1, 2, 3, 4, 5 → 3K, PK, K, 1, 2, 3, 4, 5, 6, 7, 8
- **September Intro Lesson** (`1XauzA4pCa3WHn-zH98891apaw3FhAXAl`): K, 1, 2, 3, 4, 5 → PK, K, 1, 2, 3, 4, 5
- **Root Vegetable Curry** (`1XWdm7kud_nNZ8l-YXB-w3N5wZACxYNm2KN1MaiyZL_0`): 3K, PK, K, 1, 2, 3, 4, 5, 6, 7, 8 → PK, K, 1, 2, 3, 4, 5, 6, 7, 8
- **Black-Eyed Pea Hummus** (`1Y375WuSCZ2k6-GqqK29eMqFFoBYWoKYhxT4lGiQHMzM`): 3, 4, 5, 6, 7, 8 → 3K, PK, K, 1, 2, 3, 4, 5, 6, 7, 8
- **Fattoush** (`1YeRlyncgM-gMS-Aica2Fk7wjBsRN9-K6`): K, 1, 2, 3, 4, 5, 6, 7, 8, PK, 3K → K, 1, 2, 3, 4, 5
- **Garden Jobs** (`1YeuuUtmBUDf4OXVVfrSgSGOe_iaTEAz4`): 1, 2, 3, 3K, 4, 5, 6, 7, 8, K, PK → 3K, PK, K, 1, 2, 3, 4, 5
- **Seasons/ Elementary Garden Tasks** (`1Yj9-r14SzJ7gUcs-yIxpN_78qjm3Ff9wTDSZSM5wfp4`): K, 1, 2, 3, 4, 5 → 3K, PK, K, 1, 2, 3, 4, 5
- **Ladybugs** (`1YX8Dv7UWeg1JG_ZsBPBTDCap5JOXpbhE`): 3K, PK, K, 1 → PK, K, 1
- **Tamales** (`1zbfn_WweqPwJD_we1vyGzaVTVLRvtXOaICLEpKwHxjg`): 1, 2, 3, 4, 5, K → 2, 3, 4, 5
- **Three Sisters Puppet Show** (`1zYSlW4BcZajmrZMuhUiRt6zd7hpQWdDFr4SMCuEhG48`): K, 1, 2 → 3K, PK
- **Berry Rosehip Bars** (`lesson_03de6aa8ce094d0b9fd6518830e3eae7`): 3K, PK, K, 1, 2, 3, 4, 5, 6, 8, 7 → 3K, PK, K, 1, 2, 3, 4, 5
- **---** (`lesson_1753316245157_flurdiez2`): 4, 5 → 4, 5, 6, 7, 8
- **Scallion Pancake - AAPI: Yachaejeon Vegetable Pancake** (`lesson_17d6718092a54279b7ddda0f885dda6c`): 3K, PK, K, 1, 2, 3, 4, 5, 6, 7, 8 → 3K, PK, K, 1, 2, 3, 4, 5
- **Measuring Championships(King Arthur material is restricted use)** (`lesson_2c46818290a64cb5bf46cb2a88a02e40`): 4, 5 → 3, 4, 5
- **Corn Mush and Wojapi Berry Sauce(Slideshow images and cornbread recipe  may be restricted use)** (`lesson_341634b793bd4fb69528013dbcd5d259`): 3K, PK, K, 1, 2, 3, 4, 5, 6, 7, 8 → K, 1, 4, 5, 6, 7, 8
- **Eid: Stuffed Dates** (`lesson_362e8be6fa894f5381f85297d42944f1`): 3K, PK, K, 1, 2, 3, 4, 5, 6, 7, 8 → PK, K, 1, 2, 3, 4, 5
- **Garden Intro: Bingo** (`lesson_366d2fba34d34509811093f5adfb744b`): 3K, PK, K, 1, 2, 3, 4, 5 → 3K, PK, K, 1, 2, 3
- **Chilled Cucumber and Tahini Soup with Spicy Pumpkin Seeds** (`lesson_426e363f5de14520b790695e25b95cda`): 8 → 3K, PK, K, 1, 2, 3, 4, 5, 6, 7, 8
- **Imperfect Foods** (`lesson_432a153ed122455da80567b41996b8dc`): 4, 5, 6, 7, 8 → 3K, PK, K, 1, 2, 3, 4, 5, 6, 7, 8
- **Plants and Music** (`lesson_47fca82c179549c2919a6eb283357b58`): K, 1 → 3K, PK, K, 1, 2, 3, 4
- **Jam and Jelly: Fruit Preservation** (`lesson_5a9dc306522d41b0b290259210b2fef9`): 3K, PK, K, 1, 2, 3, 4, 5, 6, 7, 8 → 3K, PK, K, 1, 2, 3, 4, 5
- **Leaf Collecting** (`lesson_624b28fc83214ed1b3999ccf1ea5d085`): 3K, PK → 3K, PK, K
- **Garden Jobs** (`lesson_6c695009089f41f99432563f09f57f40`): PK, 3K, K, 1, 2, 3, 4, 5, 6, 7, 8 → 3K, PK, K, 1, 2, 3, 4, 5
- **Pasta Party** (`lesson_730a61c3737c498fb82cb1c074d1d5b1`): 3K, PK, K, 1, 2, 3, 4, 5, 6, 7, 8 → 4, 5
- **Potato Exploration** (`lesson_78fb31393f1e4d629bfdf735ebd97694`): 3K, PK → 3K, PK, K, 1, 2, 3, 4, 5
- **Compost Relay & Stew** (`lesson_7d34e6ab88b64d8a855507ac6c47db20`): 2, 3, 4, 5, 6, 7, 8 → 3K, PK, K, 1, 2, 3, 4, 5, 6, 7, 8
- **All About Birds** (`lesson_7f6a2a772f044c0c87f98f9cde200320`): 3K, PK → PK
- **Insect Detectives** (`lesson_8bce4ab6a0e6441b8ca1a49d620f5532`): K, 1 → 3K, PK, K, 1, 2, 3, 4, 5
- **Baking Intro: Pumpkin Muffins** (`lesson_a2c4451732bd464281dfa8f7efd4d464`): 3K, PK, K, 1, 2, 3, 4, 5, 6, 7, 8 → 3, 4, 5
- **Mushroom Cultivation** (`lesson_b730f385a226452e98a7c3f972843e67`): 3, 4 → 2, 3
- **Empanadas & Corn Salad** (`lesson_be2157750d064fd3b7428af9c1944b59`): 3K, PK, K, 1, 2, 3, 4, 5, 6, 7, 8 → 3K, PK, K, 1, 2, 3, 4, 5
- **Food Preservation** (`lesson_bf1f76835a7446f78bfa843b7cbb99dd`): K, 1, 2, 3, 4, 5 → 4, 5
- **Welcome and Exploration: How humans work in the garden** (`lesson_cc0a5cb454f04aa0aaa5a30a33dac44b`): 4, 5 → 4, 5, 6, 7, 8
- **Vegetable Ramen** (`lesson_d28f99cce1784da08593876f227338ed`): 6, 7, 8 → 3K, PK, K, 1, 2, 3, 4, 5, 6, 7, 8
- **Mural Painting 101: Beautifying the Garden** (`lesson_d352a03cea784f46bbda2a545c9de44a`): 3K, PK, K, 1, 2, 3, 4, 5 → 3K, PK, K, 1, 2, 3, 4, 5, 6, 7, 8
- **Sun Printing** (`lesson_d5c52872fd214f289d3cafaf0af3e607`): K, 1, 2, 3, 4, 5, 6, 7, 8 → K, 1
- **What does a gardener do?** (`lesson_e7dbdb5dc324470392f1b761eb62fac8`): 3K, PK → 3K
- **Food Waste** (`lesson_eb0b8ac045ab4dd8a87be6c8677454bb`): 6, 7, 8 → 6, 7
- **Black Panther Party and the Free Breakfast Program** (`lesson_ef043bcf99f44965a0cc5dd6aef52a82`): 3K, PK, K, 1, 2, 3, 4, 5, 6, 7, 8 → 3K, PK, K, 1, 2, 3, 4, 5
- **Gingerbread Cookies** (`lesson_f0cfb993e2b94d4c89f272eb4269cb26`): 2, 3, 4, 5, 1, K, PK, 3K, 6, 7, 8 → 3K, PK, K, 1, 2, 3, 4, 5
- **Empanadas** (`lesson_f5a5f81079a94652b92e4f94f5281ca1`): 3, 4, 2, 1, 3K, PK, K, 5, 6, 7, 8 → 3K, PK, K, 1, 2, 3, 4, 5

## Preserved — no grade in the run, existing value kept (25)

The run found no grade for these. The apply leaves their current grades untouched (the guard never writes an empty grade).

- **Our Garden and Kitchen Community** (`0BwC8Pf3ZwAXjS3JwZUFpbVlETzA`): kept K, 1, 2, 3, 4, 5
- **Herbs as Medicine** (`0BxEc0RZeYtCidmQwN3pPdmcweE0`): kept 2, 3, 4
- **Sunprints** (`11R_zwuo7bGo8vriRV85kE7JOBXG4VslPwrEz7sme6ck`): kept 1, 2, 3, K
- **The Story of the 3 sisters** (`13FPqZmdrIamQqrzLZUoeLt8CGTnP3vNJv_C_q5gyxjA`): kept 3K, PK, K, 1, 2, 3, 4, 5, 6, 7, 8
- **Ramen and Korean food traditions** (`17BtzyY25PBuqNX7sAptazjN3TFuatIsrNWjV3hbIip0`): kept 3, 4, 5
- **Sourdough, Petri Dishes, Smoothies** (`18SdRTm5OmYYQT-lfGISMlph5ZMjMttp0m_lrnAwP5ZM`): kept 6, 7, 8
- **Legend of the 3 sisters** (`19Tg4I9XywohpcrdBZ77vaBgyIdYhxGo0bk3FpSUcE2Y`): kept 4, 5, 6
- **3 Sisters Tacos** (`1BQdTnCzvCWc7u6MA9ey1HFm-H1g-fXdcgGXFU_Fxzww`): kept 3K, PK, K, 1, 2, 3, 4, 5, 6, 7, 8
- **Seasonal Changes** (`1e0UWQYtEYVnGioomuIHx4LwJn3sJ8wKV`): kept K, 1
- **Ma'amoul Cookies for Eid** (`1EyUZUgWrURvJ_tKKdhMakD7xY5C1COcNkvdks72ZI1I`): kept 3, 4, 5, 6, 7, 8
- **Ireland / Colcannon** (`1fD6vZTk364ZQ0tfBHJAHpW-itfX28me6_VJ-w1xFr1Y`): kept 3, 4, 5
- **India / Aloo Gobi** (`1iTH3kooXMEVDsZaV1wqVGLvgXO3c55lrxtsIHGlaz28`): kept K, 1, 2, 3, 4, 5, 6, 7, 8
- **Winter After School - Session 2** (`1iwA2l4QPsqXJqu5lP8Ix5BarlTjIhxTQ`): kept 5, 6
- **Up, Down and Around** (`1jKHsDt0dglFBOn5eWUszoH9nGjpBqRrbAompJYr36tk`): kept 1, 2
- **Indoor Sprout Salad** (`1kjvlis1dnI-yov0Bw0T9X-ETXZCIR9ST6Y7MVRnlZ4o`): kept 2, 3, 4, 5
- **Unknown** (`1lDjv2GUFzOC9pSWTpCVQW2ctWvvNmTPP4Jc1iAzrsaU`): kept K
- **Food Justice: Food Marketing** (`1NKjrltsfTTjAT5IZKGHiiovZvRcvhfJx6rPVn-lbYFM`): kept 6, 7, 8
- **Food Debates** (`1pnHqm6JGB5AATRIGyU3KHeeUhKlbR7KvQXFQRxm45gA`): kept 6, 7, 8
- **Animal Life Cycles and Adaptations** (`1QNvw2_DVlrd8079Jwgyfb8jQzjho1Ut5`): kept 2, 3
- **Journey to Planet Zog** (`1rxkXE-fPrUu8PYME5h4U6N4E4CdiKTZ0fdxIZjXPDQU`): kept 3, 4, 5
- **Introduction to Photovoice** (`1TcLFx4PqfwvY7BL6hZApm039rPpWF9HENeQAXLsmt8I`): kept 6, 7, 8
- **Observing Indoor Edible Sprouts** (`1VDKC8Qz73JtOdPdK1u3bpEleKNx2cPPlCsiec6B8nqg`): kept 2, 3, 4, 5
- **Trail Mix at PS 96** (`1xAHtAr8-faQdQW0eEoA_CL1pcySGhzsWguOj9e5R3UQ`): kept 3, 4, 5
- **Foods From Around the World: Introduction** (`lesson_8be5b41f08bd43a99ac8cb113cc6dbd0`): kept 4, 5
- **Natural Dyeing** (`lesson_8d78bb09ecd746d8a57fa67bad78d55b`): kept K, 1, 2, 3, 4, 5, 6, 7, 8


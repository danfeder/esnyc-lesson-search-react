-- ============================================================================
-- FP4 Brief 5 — Phase 2 data fix: summary backfill + title hygiene + one retire
-- ============================================================================
-- Approved scope: docs/plans/fp4-briefs/brief-5-summaries-review.md
--   §2 (65 EXTRACTED summaries) + §3 (21 control-char title fixes, incl. the two
--   internal double-space collapses on rows 5 & 18) + OWNER DECISIONS:
--     #1 Butterflies -> tightened string (below)
--     #2 Jam and Jelly -> trailing "Note:" sentence dropped (below)
--     #3 --- (lesson_1753316245157_flurdiez2) -> RETIRE (not delete); byte-identical
--        duplicate of its twin lesson_cc0a5cb454f04aa0aaa5a30a33dac44b, which stays
--        active and receives summary row 62.
--
-- DATA-ONLY. No schema change. Idempotent. Fail-safe by construction:
--   * Summaries are applied by JOINING on each row's CLEANED title (65 distinct clean
--     titles verified on PROD/TEST) — not on hand-typed opaque lesson_ids. A summary
--     therefore always travels WITH its title, so mis-pairing is impossible; any
--     transcription slip in a join key simply fails to match, leaving that row blank,
--     which the post-assert (0 remaining blanks) catches. The join keys below were
--     copied verbatim from a live PROD SELECT, not retyped from the rendered doc.
--   * Title hygiene touches ONLY rows carrying a control char (verified = exactly the
--     21 approved; 0 changed-without-ctrl), via the owner-approved DB formula from
--     review §3 — no hand-typed titles. The formula maps control runs -> single space
--     and collapses multi-space runs (covers rows 5 & 18's internal double spaces).
--   * The retire replicates the shape of the existing 82 retired rows: set retired_at
--     + retired_reason (a dedup:* string); updated_at is NOT bumped (matches evidence).
--     Guarded by retired_at IS NULL so a re-run is a no-op.
--
-- NOT-VALID CHECK gotcha (valid_cooking_skills / valid_main_ingredients re-validate the
--   whole row on UPDATE): violators among the 66 touched rows were 0 on 2026-07-03.
--   Re-probe immediately before ANY apply (see rehearsal doc); if != 0, STOP.
--
-- Asserts are data-driven (assert "0 blanks remain", "active drops by exactly 1"), so
--   this one file is valid on TEST (58 blanks match -> filled) and PROD (65 match).
--
-- Run as ONE transaction. The pre/post-assert DO blocks RAISE (abort) on any deviation,
--   so a bad run rolls back at COMMIT. For the TEST rehearsal, the same body is run with
--   COMMIT replaced by a diagnostic SELECT + ROLLBACK (see brief-5-phase2-rehearsal.md).
-- ============================================================================

BEGIN;

LOCK TABLE public.lessons IN SHARE ROW EXCLUSIVE MODE;

-- (1) Approved summaries, keyed by cleaned title (join key = verbatim live-PROD value).
CREATE TEMP TABLE _fix (clean_title text NOT NULL, summary text NOT NULL) ON COMMIT DROP;
INSERT INTO _fix (clean_title, summary) VALUES
 ('All About Lanternflies lesson', 'Students will learn about lanternflies, an invasive insect in the garden, and how to protect the garden from these pests.'),
 ('All About Pumpkins', 'Students will learn all about the pumpkin plant, and mix and eat roasted pumpkin seeds.'),
 ('All About Squirrels', 'Students play a game to learn about squirrels, a common visitor to the garden, and the squirrel’s role in seed dispersal.'),
 ('Anthotype', 'Students will learn about how plants can be used for crafts and to take a picture without a camera. They will make their own anthotype.'),
 ('Bees', 'Students make a bee puppet while learning about the life of a bee.'),
 ('Bees and Blueberries', 'Students will learn about bees as pollinators and make blueberry muffins, plant native plants in a pollinator garden, and/or make lip balm.'),
 ('Beet Valentines', 'Students learn about beets, try a beet tasting, and make Valentine’s Day cards using beets.'),
 ('Berry Rosehip Bars', 'Students bake bars with berries and rosehips and learn about foods native to North America.'),
 ('Black Panther Party and the Free Breakfast Program', 'Students will learn about the Black Panther Party’s free breakfast initiative as a means of resistance and change.'),
 ('Booker T. Whatley’s CSA (Photos of Booker T. Whatley may be restricted use)', 'Students will learn about the teachings of Black professor and horticulturist Booker T. Whatley, and his pioneering of the CSA (Community Supported Agriculture) model in the US. Students will then participate in their own class-sized CSA program.'),
 -- #11 Butterflies: OWNER DECISION #1 — tightened version (verbatim).
 ('Butterflies', 'Students learn about the butterfly life cycle and about butterflies as pollinators, then make their own butterflies and ''fly'' them around the room looking for flowers.'),
 ('Chilled Cucumber and Tahini Soup with Spicy Pumpkin Seeds', 'Students make a cold cucumber soup using summer vegetables and herbs while learning about Palestinian culture.'),
 ('Compost Relay & Stew', 'Students will learn about compost, participate in a compost relay by measuring and adding different ingredients that go into compost, and make a compost “stew” with edible ingredients that represent materials that go into compost.'),
 ('Corn Mush and Wojapi Berry Sauce (Slideshow images and cornbread recipe may be restricted use)', 'Students will learn about corn mush and wojapi, a popular Native American dish.'),
 ('Decomposition Experiment', 'Students will prepare items to go in a decomposition experiment and fill out a worksheet with their predictions.'),
 ('Decomposition Experiment Part 2', 'Students will observe the results of their decomposition experiment and compare these results with their original hypotheses.'),
 ('Dr. Carver and Calendula', 'Students will learn about Dr. Carver and make their own salve.'),
 ('Eid: Stuffed Dates', 'Students will learn about the importance of Eid and make stuffed dates.'),
 ('Empanadas', 'Students will prepare and taste empanadas.'),
 ('Empanadas & Corn Salad', 'Students will make empanadas and corn salad.'),
 ('Fall Fruit vs. Summer Fruit', 'Students will compare summer fruits and vegetables with fall fruits and vegetables and discuss why certain things grow at certain times.'),
 ('Food Justice Advocates: Food Scarcity', 'Students learn about the concepts of food justice and advocacy generally and about food insecurity in particular, and consider what actions they can take against food insecurity. They make and eat a healthy fruit snack and brainstorm ideas for a TikTok advocating for policies to end food insecurity.'),
 ('Food Origins Scavenger Hunt (check images for copyright)', 'Students explore the garden using a scavenger hunt that directs them to find the geographic origins of different plants.'),
 ('Food Safety', 'Students will learn about the “food safety chain” and how we keep food safe in our food system. Students will ultimately focus on how they can safely handle food at home with the “4 Steps to Food Safety”. They will practice these steps with a recipe in class.'),
 ('Food Waste', 'Students will learn about the impact of food waste on the environment.'),
 ('Garden Intro: Bingo', 'Students will go over garden norms and be introduced to the garden community through a bingo game.'),
 ('Garden Jeopardy', 'Students engage in a Jeopardy-style game to review their garden knowledge.'),
 ('Gardening & The Environment', 'Students will get a (re)introduction to the school garden and learn about the various ways gardening is beneficial for the environment.'),
 ('Gingerbread Cookies', 'Students will practice baking skills to make gingerbread cookies and share about how they celebrate the holidays.'),
 ('Growing Indoor Edible Sprouts', 'Students plant “soil sprouts” as a first step toward growing microgreens for their seed-to-table salad unit.'),
 ('Haudenosaunee', 'Students will read/listen to the Haudenosaunee Thanksgiving Address, partake in a garden job related to Native teachings, and do a gratitude activity related to the Thanksgiving address.'),
 ('Healing with Roses (Instructions and article may be restricted use)', 'Students will make a rose glycerite tincture (glycerite is a sweet syrupy plant-based extract) and rose infused honey to understand the healing properties of roses, physically, emotionally and spiritually.'),
 ('Hoppin'' John Burgers', 'Students will learn about ingredients as they relate to African American history then use those ingredients to make Hoppin’ John burgers.'),
 ('How Food Moves (Food Miles)', 'Students will play a game in which they are assigned miles based on foods they choose. They will evaluate whether the winner of the game should be the team with the most or least miles based on their discussion of the impact of each kind of food.'),
 ('Imperfect Foods', 'Students will learn about “ugly” produce and make a delicious dish using “ugly” produce.'),
 ('Insect Detectives', 'Students will build familiarity around insects by completing an insect scavenger hunt in the garden.'),
 ('Interconnection & Native American Traditions', 'Students will read about Native American history, traditions, and environmental stewardship, then practice environmental stewardship in the garden while being mindful of the interconnected relationships between people, plants, and animals.'),
 ('Intro to Garden Class', 'Students go over expectations and goals for the year then go over plant parts by creating their own “exquisite plants”.'),
 -- #39 Jam and Jelly: OWNER DECISION #2 — first two sentences only (trailing "Note:" dropped).
 ('Jam and Jelly: Fruit Preservation', 'Students will learn about preservation of food, specifically how berries and fruits can be preserved through the canning process to make jam/jelly. Students will watch a video, read a book, and spend the rest of the class making personal jars of jam/jelly to take home.'),
 ('Leaf Collecting', 'Students talk about fall in the garden and collect leaves to put in compost or to use as mulch.'),
 ('Measuring Championships (King Arthur material is restricted use)', 'Students will practice techniques for measuring dry ingredients using cup measures by playing a competitive teams-based game.'),
 ('Mobile Education: Mexican Street Corn Salad (Esquites)', 'Students will be welcomed or welcomed back to ESYNYC programming, go over class expectations, learn about Mexican culture and food traditions and make Esquites: Mexican corn salad.'),
 ('Mural Painting 101: Beautifying the Garden', 'Students will learn about the importance of using art to take ownership of and take care of public spaces, and begin the process of painting a mural in their garden.'),
 ('Mushroom Cultivation', 'Students will learn more about how mushrooms are grown, through discussion and video, then inoculate their own mushroom bags using cardboard and mushroom spawn.'),
 ('Natural Dyeing', 'Students will create their own dyed fabrics using natural materials from the garden and kitchen.'),
 ('NEW Place Based: Native Plants in Our Garden', 'Students will learn about plants and animals living in Manahatta.'),
 ('Our Garden Community', 'Students will read a story about the members of a garden community, then make their own illustrations about what plants, animals, and people are part of a garden community.'),
 ('Pasta Party', 'Classes that have earned enough petal points will celebrate with a pasta-themed party.'),
 ('Plant Part Investigation', 'Students will identify different parts of a plant: roots, leaves, stems, and flowers.'),
 ('Plant Part Scavenger', 'Students will use visuals, song, and drawing to learn the six major parts of a plant.'),
 ('Plants as Medicine', 'Students will make a tea bag of aromatic herbs to understand how plants have been used as medicine.'),
 ('Puppet Pollinators', 'Students will learn about the basics of pollination, a crucial process that happens in the garden, and then create a simple butterfly puppet.'),
 ('Rainsticks', 'Students will explore the relationship between plants and music and make some plant-based musical instruments.'),
 ('Recycle Gardening', 'Students will learn the basic necessities to grow food and plants in an urban setting and get to plant seeds in recycled containers.'),
 ('Scallion Pancake - AAPI: Yachaejeon Vegetable Pancake', 'Students will learn about a popular Korean food Yachaejeon (Vegetable Pancake) to celebrate AAPI month.'),
 ('School and Garden Communities', 'Students will sing a song about the different members of our garden community and do a garden job to understand that they as students are important members of the garden community.'),
 ('Sensory Scavenger Hunt and', 'Students are welcomed to the garden and taught garden expectations. Students will explore the garden on their own.'),
 ('Street Vendors/"Chicken" Over Rice', 'Students will learn about the history of mobile street vending, create a model food truck business, and prepare an ESYNYC take on NYC’s classic halal cart “chicken over rice.”'),
 ('Sun Printing/Cyanotype', 'Students will become familiar with what flowers, leaves and plant parts are in the garden, and use them to make cyanotypes or sun prints.'),
 ('Three Sisters and Companion Planting: a Seed Study', 'Students will learn about the 3 Sisters, companion planting, and Indigenous heritage month. Students will observe and sort 3 sisters seeds.'),
 ('Three Sisters Puppet Show', 'Students will enjoy a puppet show to hear about the Lenape Legend of the 3 sisters.'),
 ('Welcome and Exploration: How humans work in the garden', 'Students are welcomed to the garden, go over garden rules, and participate in garden chores acting as different characters.'),
 ('Wild Soda', 'Students will learn about wild yeast and make and taste some wild sodas.'),
 ('Worms and Compost', 'Students will examine the worm bin, discuss the importance of healthy soil, and complete a worm-related worksheet.'),
 ('Worms K-1', 'Students will study worms in an indoor worm bin, draw what they see, and do the worm dance.');

-- (2) Pre-flight guards: approved set integrity + every blank-active row is covered.
DO $$
DECLARE n_rows int; n_distinct int; blank_before int; covered int;
BEGIN
  SELECT count(*), count(DISTINCT clean_title) INTO n_rows, n_distinct FROM _fix;
  IF n_rows <> 65 OR n_distinct <> 65 THEN
    RAISE EXCEPTION 'PRE: _fix must hold 65 distinct rows (got rows=%, distinct=%)', n_rows, n_distinct;
  END IF;

  SELECT count(*) INTO blank_before FROM lessons WHERE retired_at IS NULL AND btrim(summary) = '';
  SELECT count(*) INTO covered FROM lessons L
    WHERE L.retired_at IS NULL AND btrim(L.summary) = ''
      AND btrim(regexp_replace(regexp_replace(L.title,'[[:cntrl:]]+',' ','g'),'\s{2,}',' ','g'))
          IN (SELECT clean_title FROM _fix);
  IF covered <> blank_before THEN
    RAISE EXCEPTION 'PRE: % blank-active row(s) not covered by approved list (blank_before=%, covered=%)',
      blank_before - covered, blank_before, covered;
  END IF;
  RAISE NOTICE 'PRE ok: % blank-active rows, all covered by approved list', blank_before;
END $$;

-- (3) Apply summaries (join on cleaned title) + title hygiene (control-char rows only).
CREATE TEMP TABLE _upd ON COMMIT DROP AS
WITH u AS (
  UPDATE lessons L
     SET summary = f.summary,
         title = CASE
                   WHEN L.title ~ '[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]'
                   THEN btrim(regexp_replace(regexp_replace(L.title,'[[:cntrl:]]+',' ','g'),'\s{2,}',' ','g'))
                   ELSE L.title
                 END
    FROM _fix f
   WHERE L.retired_at IS NULL
     AND btrim(L.summary) = ''
     AND btrim(regexp_replace(regexp_replace(L.title,'[[:cntrl:]]+',' ','g'),'\s{2,}',' ','g')) = f.clean_title
  RETURNING L.lesson_id
)
SELECT lesson_id FROM u;

-- (4) Retire the byte-identical "---" duplicate. Twin cc0a5c... stays active (got row 62).
CREATE TEMP TABLE _ret ON COMMIT DROP AS
WITH r AS (
  UPDATE lessons
     SET retired_at = now(),
         retired_reason = 'dedup:welcome-exploration-byte-identical-of-cc0a5c'
   WHERE lesson_id = 'lesson_1753316245157_flurdiez2'
     AND retired_at IS NULL
  RETURNING lesson_id
)
SELECT lesson_id FROM r;

-- (5) Post-assert guards — RAISE (abort at COMMIT) on any deviation.
DO $$
DECLARE matched int; blanks_after int; retired_n int; dirty_active int; twin_summary text;
BEGIN
  SELECT count(*) INTO matched      FROM _upd;
  SELECT count(*) INTO retired_n    FROM _ret;
  SELECT count(*) INTO blanks_after FROM lessons WHERE retired_at IS NULL AND btrim(summary) = '';
  SELECT count(*) INTO dirty_active FROM lessons
    WHERE retired_at IS NULL
      AND (title <> btrim(title)
           OR title ~ '[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]'
           OR btrim(title, E' \t\n\r\x0B\x0C-') = '');
  SELECT summary INTO twin_summary FROM lessons WHERE lesson_id = 'lesson_cc0a5cb454f04aa0aaa5a30a33dac44b';

  IF blanks_after <> 0 THEN
    RAISE EXCEPTION 'POST: % blank-active summaries remain (expected 0)', blanks_after;
  END IF;
  IF retired_n <> 1 THEN
    RAISE EXCEPTION 'POST: retire touched % rows (expected 1)', retired_n;
  END IF;
  IF dirty_active <> 0 THEN
    RAISE EXCEPTION 'POST: % active rows still have dirty titles (expected 0)', dirty_active;
  END IF;
  IF twin_summary IS DISTINCT FROM
     'Students are welcomed to the garden, go over garden rules, and participate in garden chores acting as different characters.' THEN
    RAISE EXCEPTION 'POST: twin (cc0a5c...) summary mismatch: %', twin_summary;
  END IF;

  RAISE NOTICE 'POST ok: matched=%, blanks_after=0, retired=1, dirty_active=0, twin summary set', matched;
END $$;

COMMIT;

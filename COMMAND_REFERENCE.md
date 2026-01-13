# 🎮 Reaction Command Reference

## New Commands Added (9)
All using **api.phawse.lol** for GIFs

### Cute/Playful Commands
- **`/boop`** - Boop someone on the nose! (cute, playful tap)
- **`/poke`** - Poke someone! (prod, jab, annoy)
- **`/pinch`** - Pinch someone! (tweak, squeeze)
- **`/wink`** - Wink at someone! (flirt, tease)
- **`/lick`** - Lick someone! (playful, teasing)
- **`/pout`** - Pout cutely! (sulk, adorable)
- **`/smirk`** - Smirk at someone! (cocky, confident, sly)

### Celebration/Connection Commands
- **`/highfive`** - Give someone a high-five! (celebrate, victory)
- **`/handhold`** - Hold hands with someone! (romantic, intimate)

---

## Existing Commands (16)

### Affection & Romance
- **`/hug`** - Hug someone (embrace, cuddle, snuggle)
- **`/kiss`** - Kiss someone (smooch, peck, lip)
- **`/nuzzle`** - Nuzzle someone (snuggle, cuddle, affection)
- **`/pet`** - Pet someone (pat, stroke, caress)

### Emotions & Reactions
- **`/blush`** - Blush adorably! (shy, embarrassed, flustered)
- **`/cheer`** - Cheer someone on! (celebrate, clap, hype, support)
- **`/pout`** - Pout cutely! (sulk, adorable)
- **`/dance`** - Dance with someone! (groove, move, jive)

### Playful Aggression
- **`/bite`** - Bite someone (nibble, chomp)
- **`/slap`** - Slap someone (hit, punch, strike)
- **`/tickle`** - Tickle someone (tease, giggle, laugh)
- **`/stare`** - Stare at someone (glare, ogle, eye contact)

### NSFW Commands
- **`/edge`** - Edge someone 🔞 (arousal, buildup)
- **`/horny-level`** - Check the horny level 🔞 (arousal rating)
- **`/spank`** - Spank someone 🔞 (playful aggression)
- **`/suck`** - Suck someone 🔞 (oral, pleasure)
- **`/rape`** - Playfully attack someone! (aggressive roleplay)

---

## Command Categories

**User-Target Commands** (2 parameters):
- bite, slap, poke, pinch, tickle, wink, lick, boop, highfive, pet, hug, kiss, nuzzle, stare, handhold

**Self Commands** (1 parameter):
- blush, cheer, dance, pout, smirk

**Mixed Commands** (optional user):
- smirk (can target user or do solo)

**Rated Commands** (1 parameter):
- horny-level (check any user's horny level)

---

## API Endpoints Used

**SFW:**
- `/gif/bite`, `/gif/blush`, `/gif/boop`, `/gif/cheer`, `/gif/dance`, `/gif/hug`, `/gif/kiss`, `/gif/lick`, `/gif/nuzzle`, `/gif/pat`, `/gif/pinch`, `/gif/poke`, `/gif/pout`, `/gif/slap`, `/gif/smirk`, `/gif/stare`, `/gif/tickle`, `/gif/wink`, `/gif/highfive`, `/gif/handhold`

**NSFW:**
- `/nsfw/edge`, `/nsfw/oppai`, `/nsfw/bondage`, `/nsfw/blowjob`

---

## Total: 25 Commands
- **SFW/Affection:** 20 commands
- **NSFW:** 5 commands
- **Stats Tracking:** 10 commands (bite, edge, hug, kiss, nuzzle, pet, slap, spank, stare, rape)
- **Horny Level System:** horny-level command

---

## Suggested Future Commands

### More Reaction Types
- **`/cuddle`** - Deep cuddle session (romantic, cozy)
- **`/nap`** - Take a nap with someone (relax, sleep)
- **`/facepalm`** - Facepalm in disappointment/frustration
- **`/greet`** - Greet someone (wave, hello, welcome)
- **`/apologize`** - Say sorry to someone (formal apology)
- **`/compliment`** - Give someone a compliment
- **`/comfort`** - Comfort someone (hug, support, reassure)
- **`/tease`** - Tease someone playfully
- **`/seduce`** - Seduce someone (flirty, suggestive)
- **`/tackle`** - Tackle someone playfully
- **`/growl`** - Growl at someone (aggressive, territorial)
- **`/laugh`** - Laugh at something (funny, amused)
- **`/cry`** - Cry (emotional, sad)
- **`/scream`** - Scream (excited, scared, angry)

### Game-Based Commands
- **`/duel`** - Challenge someone to a duel (with damage/stats)
- **`/marry`** - Marry someone (relationship system)
- **`/divorce`** - Divorce someone (relationship system)
- **`/gift`** - Give someone a gift (economy system)

### Stats Commands
- **`/stats`** - Check your reaction stats
- **`/leaderboard`** - See who's been hugged/kissed/etc the most

---

## Implementation Notes
- All commands use **phawse.lol API** for GIF fetching
- Commands have fallback text if GIF fails to load
- Commands with two parameters prevent self-targeting
- Stats are tracked in JSON files (persistent)
- Emoji indicators in embeds for visual feedback
- Color-coded embeds based on reaction type

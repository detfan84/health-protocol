# Protocol Tracker

A personal, offline-first health protocol tracker. One person's private log,
published as a static site so it can be installed as a phone app.

---

## ⚠️ Read this first

**This is not medical advice.** If you found this repository or the deployed
site by accident, please understand what it is before you take anything from it.

- **It is one individual's private record.** Built by and for a single person to
  track their own protocol. It is not medical, clinical, nutritional, or
  professional advice. It is not a diagnosis or a treatment plan. It has not
  been reviewed, endorsed, or supervised by any physician, therapist, or health
  authority.
- **Nothing here was written for you.** The protocols, dosages, exercises, and
  observations reflect one person's specific conditions, surgical history, and
  conversations with their own clinicians. They are not general
  recommendations. What suits one body may be useless or actively harmful for
  another. Do not follow any of it because you found it here.
- **Talk to a professional first.** Always seek the advice of a physician or
  other qualified health provider with any questions about a medical condition,
  supplement, or exercise programme. Never disregard professional medical
  advice, or delay seeking it, because of something you read here. If you think
  you may have a medical emergency, contact your doctor or emergency services
  immediately.
- **Physical risk is real.** Parts of this describe manual soft-tissue work,
  loaded stretching, eccentric loading, nerve mobilisation, breath holds, and
  cold exposure. These carry genuine risk of injury, and several carry specific
  risks for people with connective tissue, cardiovascular, or autonomic
  conditions. Undertaking anything described here is done entirely at your own
  risk.
- **No warranty, no liability.** This software and its content are provided
  "as is", without warranty of any kind, express or implied, including but not
  limited to warranties of merchantability, fitness for a particular purpose,
  accuracy, and non-infringement. In no event shall the author be liable for any
  claim, damages, injury, or other liability, whether in an action of contract,
  tort, or otherwise, arising from or in connection with this software or its
  use.

---

## Your data

Everything entered stays in your own browser's IndexedDB, on your own device.
Nothing is transmitted to any server, and the author cannot see it. There is no
account, no analytics, and no backend.

Clearing your browser data deletes it permanently. Use the export buttons if you
want a backup — they write a plain JSON file that the app can import again.

## Running it

```bash
npm install
npm run dev        # development server
npm test           # unit tests
npm run build      # production build into dist/
npm run preview    # serve the production build
```

## Body work photographs

Reference photographs come from the [Free Exercise
DB](https://github.com/yuhonas/free-exercise-db), released into the public
domain under the Unlicense. They illustrate general movement patterns; the
people depicted have no connection to this project and are not instructing
anyone.

`scripts/refresh-bodywork-images.sh` rebuilds `public/bodywork-images/` and is
where to add more sets.

Where a photograph shows the pattern but not the exact drill, its caption says
so. Some cards deliberately carry no photograph — either because the library
genuinely has nothing (breathing, tongue and vagal work are not exercises) or
because the closest match would teach the wrong thing. Those cards name the
near-miss that was rejected rather than showing it.

## Licence

Source code is released under the MIT Licence — see [LICENSE](LICENSE). The
personal health content is published for transparency, not for reuse as
guidance.

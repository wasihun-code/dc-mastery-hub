import config from '../config.js'
import db from '../db/database.pg.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DEFAULT_CONTENT_FOLDER = path.resolve(__dirname, '../../content')

export async function getChallenges(courseSlug) {
  const row = await db.prepare(`
    SELECT c.id, t.slug as track_slug
    FROM courses c
    JOIN track_courses tc ON c.id = tc.course_id
    JOIN tracks t ON tc.track_id = t.id
    WHERE c.slug = ?
    LIMIT 1
  `).get(courseSlug)
  
  if (!row) return []
  
  const track = { slug: row.track_slug }

  const contentFolder = config.CONTENT_PATH

  const datasetsPath = path.join(contentFolder, 'tracks', track.slug, courseSlug, 'datasets')
  
  if (!fs.existsSync(datasetsPath) || !fs.statSync(datasetsPath).isDirectory()) {
    return []
  }

  const files = fs.readdirSync(datasetsPath)
  const validDatasets = files.filter(f => !f.startsWith('.') && (f.endsWith('.csv') || f.endsWith('.pkl') || f.endsWith('.p')))
  
  if (validDatasets.length === 0) return []

  const concepts = await db.prepare('SELECT * FROM concepts WHERE course_id = ?').all(row.id)
  const conceptNames = concepts.map(c => c.name)

  const challenges = []
  let challengeIdCounter = 1

  for (const datasetFile of validDatasets) {
    const isCsv = datasetFile.endsWith('.csv')
    const readFunc = isCsv ? `pd.read_csv('${datasetFile}')` : `pd.read_pickle('${datasetFile}')`
    const ext = isCsv ? 'CSV' : 'Pickle'
    
    // Level 1: Load and inspect
    challenges.push({
      id: `chal_${challengeIdCounter++}`,
      title: `Load ${ext} Dataset`,
      difficulty: 1,
      description: `Load the dataset into a variable called df and print the first 5 rows to inspect it.`,
      dataset_file: datasetFile,
      starter_code: `import pandas as pd\n\n# Load the dataset\ndf = ${readFunc}\n\n# Print first 5 rows\n`,
      expected_output_code: `import pandas as pd\ndf = ${readFunc}\nprint(df.head())`,
      hints: ['Use the pd.read_csv() or pd.read_pickle() function depending on the file type.', 'Use the .head() method to show the first 5 rows, and remember to print() it.'],
      concepts_tested: ['pandas loading', 'df.head()']
    })

    // Level 1: Summary Statistics
    challenges.push({
      id: `chal_${challengeIdCounter++}`,
      title: `Summary Statistics`,
      difficulty: 1,
      description: `Load the dataset into a variable called df. Calculate and print the summary statistics of the numeric columns. Store the result in a variable called result, then print result at the end.`,
      dataset_file: datasetFile,
      starter_code: `import pandas as pd\ndf = ${readFunc}\n\n# Calculate summary statistics\nresult = \n\nprint(result)`,
      expected_output_code: `import pandas as pd\ndf = ${readFunc}\nresult = df.describe()\nprint(result)`,
      hints: ['Use the .describe() method on your DataFrame.', 'Make sure you assign the output to the variable named result before printing it.'],
      concepts_tested: ['df.describe()']
    })
    
    // Level 2: Shape
    challenges.push({
      id: `chal_${challengeIdCounter++}`,
      title: `Dataset Dimensions`,
      difficulty: 2,
      description: `Load the dataset into a variable called df. Find the dimensions (number of rows and columns) of the dataset. Store the shape tuple in a variable called result and print result at the end.`,
      dataset_file: datasetFile,
      starter_code: `import pandas as pd\ndf = ${readFunc}\n\n# Get dimensions\nresult = \n\nprint(result)`,
      expected_output_code: `import pandas as pd\ndf = ${readFunc}\nresult = df.shape\nprint(result)`,
      hints: ['.shape is an attribute, not a method, so do not use parentheses.', 'The output should look like a tuple: (rows, columns).'],
      concepts_tested: ['df.shape']
    })

    // Add more if we need at least 8 per course...
    // Let's add some generic ones that work on any dataframe
    challenges.push({
      id: `chal_${challengeIdCounter++}`,
      title: `Dataset Information`,
      difficulty: 2,
      description: `Load the dataset into a variable called df. Print a concise summary of the DataFrame using the appropriate method.`,
      dataset_file: datasetFile,
      starter_code: `import pandas as pd\ndf = ${readFunc}\n\n# Print concise summary\n`,
      expected_output_code: `import pandas as pd\ndf = ${readFunc}\ndf.info()`,
      hints: ['Use the .info() method.', 'Note that .info() prints to the console directly by default.'],
      concepts_tested: ['df.info()']
    })
  }

  // Ensure we limit to a reasonable number or mix them up
  // Randomize order to mix difficulties and datasets
  return challenges.sort(() => 0.5 - Math.random()).slice(0, 10)
}

/**
 * Extract content from Google Docs
 */

// Extract plain text from Google Doc structure
export function extractTextFromGoogleDoc(doc: any): string {
  let text = '';

  if (doc.body?.content) {
    for (const element of doc.body.content) {
      if (element.paragraph?.elements) {
        for (const textRun of element.paragraph.elements) {
          if (textRun.textRun?.content) {
            text += textRun.textRun.content;
          }
        }
      } else if (element.table) {
        // Handle tables
        text += '\n[Table]\n';
        if (element.table.tableRows) {
          for (const row of element.table.tableRows) {
            if (row.tableCells) {
              for (const cell of row.tableCells) {
                if (cell.content) {
                  for (const cellElement of cell.content) {
                    if (cellElement.paragraph?.elements) {
                      for (const textRun of cellElement.paragraph.elements) {
                        if (textRun.textRun?.content) {
                          text += textRun.textRun.content.trim() + ' | ';
                        }
                      }
                    }
                  }
                }
              }
              text = text.slice(0, -3) + '\n'; // Remove last ' | '
            }
          }
        }
      } else if (element.sectionBreak) {
        text += '\n\n---\n\n';
      }
    }
  }

  return text.trim();
}

// Extract basic metadata from content (simplified since reviewer will manually tag)
export function extractMetadataFromContent(content: string): any {
  // Just return basic content stats
  // The reviewer will manually tag all the actual metadata
  return {
    // No need to extract grade levels, themes, or skills
    // since the reviewer will enter these manually
  };
}

Test a Supabase Edge Function locally. Provide the function name: /test-edge-fn function-name

Steps:
1. Start the function locally:
   ```bash
   supabase functions serve <function-name> --no-verify-jwt
   ```

2. Test with curl (adjust the payload as needed):
   ```bash
   curl -i --location --request POST \
     'http://localhost:54321/functions/v1/<function-name>' \
     --header 'Content-Type: application/json' \
     --data '{}'
   ```

3. Check for common issues:
   - CORS headers present in response
   - Proper error handling with JSON response
   - Environment variables accessible via `Deno.env.get()`

Available edge functions:
- `detect-duplicates` - Check for duplicate lesson submissions
- `process-submission` - Process new lesson submissions
- `extract-google-doc` - Extract content from Google Docs
- `send-email` - Send emails via Resend

export function generateRoleChangedEmail(data: any, email: string): string {
  const baseUrl = Deno.env.get('PUBLIC_SITE_URL') || 'https://app.esynyc.org';

  // Get permissions for old and new roles
  const getPermissionsForRole = (role: string): string[] => {
    switch (role) {
      case 'teacher':
        return ['View and search lesson library', 'Submit new lesson plans'];
      case 'reviewer':
        return [
          'View and search lesson library',
          'Submit new lesson plans',
          'Review submitted lessons',
          'Approve lessons for publication',
          'View analytics and reports',
        ];
      case 'admin':
        return [
          'View and search lesson library',
          'Submit new lesson plans',
          'Review submitted lessons',
          'Approve lessons for publication',
          'Delete lessons',
          'View user accounts',
          'Invite new users',
          'Edit user profiles',
          'View analytics and reports',
          'Manage duplicate lessons',
          'Export lesson data',
        ];
      case 'super_admin':
        return ['All system permissions'];
      default:
        return ['View and search lesson library'];
    }
  };

  const oldPermissions = getPermissionsForRole(data.oldRole || 'teacher');
  const newPermissions = getPermissionsForRole(data.newRole || 'teacher');

  // Find added and removed permissions
  const addedPermissions = newPermissions.filter((p) => !oldPermissions.includes(p));
  const removedPermissions = oldPermissions.filter((p) => !newPermissions.includes(p));

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Role Updated</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #22c55e; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background-color: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .role-change { background-color: #e0f2fe; border: 1px solid #7dd3fc; padding: 15px; border-radius: 6px; margin: 20px 0; text-align: center; }
          .permissions { background-color: white; padding: 15px; border-radius: 6px; margin: 15px 0; }
          .added { color: #16a34a; }
          .removed { color: #dc2626; }
          .button { display: inline-block; background-color: #22c55e; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
          .button:hover { background-color: #16a34a; }
          .footer { text-align: center; color: #6b7280; font-size: 14px; margin-top: 30px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Your Role Has Been Updated</h1>
          </div>
          <div class="content">
            <p>Hi ${data.recipientName || 'there'},</p>
            
            <p>Your role in the ESYNYC Lesson Library has been updated by ${data.changedBy || 'an administrator'}.</p>
            
            <div class="role-change">
              <p style="margin: 0; font-size: 18px;">
                <strong>${data.oldRole || 'Teacher'}</strong> → <strong>${data.newRole || 'Teacher'}</strong>
              </p>
            </div>
            
            ${
              addedPermissions.length > 0 || removedPermissions.length > 0
                ? `
              <div class="permissions">
                ${
                  addedPermissions.length > 0
                    ? `
                  <p><strong class="added">✓ New Permissions:</strong></p>
                  <ul>
                    ${addedPermissions.map((p) => `<li class="added">${p}</li>`).join('')}
                  </ul>
                `
                    : ''
                }
                
                ${
                  removedPermissions.length > 0
                    ? `
                  <p><strong class="removed">✗ Removed Permissions:</strong></p>
                  <ul>
                    ${removedPermissions.map((p) => `<li class="removed">${p}</li>`).join('')}
                  </ul>
                `
                    : ''
                }
              </div>
            `
                : ''
            }
            
            <p>You can continue using the platform with your new permissions immediately.</p>
            
            <div style="text-align: center;">
              <a href="${baseUrl}" class="button">Go to Dashboard</a>
            </div>
            
            <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
              If you have questions about this change, please contact your administrator or reply to this email.
            </p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} Edible Schoolyard NYC. All rights reserved.</p>
            <p>This is an automated notification about your account changes.</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

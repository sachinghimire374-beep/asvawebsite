-- Removes the Portfolio (projects) and Insights (blog) features.
--
-- DESTRUCTIVE: every project, case study, blog post, revision, author, category
-- and tag is deleted permanently. Take a database backup before applying this
-- migration. `project_inquiries` (the "Start a project" lead pipeline) is a
-- different feature and is intentionally left untouched.

-- Join and child tables first, then parents, so foreign keys never block a drop.
DROP TABLE IF EXISTS "blog_post_tags" CASCADE;
DROP TABLE IF EXISTS "blog_post_revisions" CASCADE;
DROP TABLE IF EXISTS "blog_posts" CASCADE;
DROP TABLE IF EXISTS "blog_tags" CASCADE;
DROP TABLE IF EXISTS "blog_categories" CASCADE;
DROP TABLE IF EXISTS "authors" CASCADE;

DROP TABLE IF EXISTS "project_images" CASCADE;
DROP TABLE IF EXISTS "project_technologies" CASCADE;
DROP TABLE IF EXISTS "projects" CASCADE;
DROP TABLE IF EXISTS "project_categories" CASCADE;

-- Drop the permissions these features owned, and any role grants pointing at them.
DELETE FROM "role_permissions"
WHERE "permissionId" IN (SELECT "id" FROM "permissions" WHERE "key" IN ('projects.manage', 'blog.manage'));

DELETE FROM "permissions" WHERE "key" IN ('projects.manage', 'blog.manage');

-- Drop navigation entries that pointed at the removed sections.
DELETE FROM "navigation_items"
WHERE "href" IN ('/portfolio', '/blog') OR "href" LIKE '/portfolio/%' OR "href" LIKE '/blog/%';

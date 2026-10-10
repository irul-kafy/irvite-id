ALTER TABLE `template_assets` DROP FOREIGN KEY `template_assets_template_id_fkey`;
ALTER TABLE `template_assets`
ADD CONSTRAINT `template_assets_template_id_fkey`
FOREIGN KEY (`template_id`) REFERENCES `templates`(`id`)
ON DELETE RESTRICT ON UPDATE CASCADE;

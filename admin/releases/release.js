const fs = require('fs');
const path = require('path');

module.exports = (instance, options, next) => {

    // instance.register(require('fastify-multipart'), {
    //     addToBody: true,
    //     files: 1,
    //     fileSize: 100 * 1024 * 1024 * 1024,
    // });

    const authorizeAsAdmin = (request, reply, done) => {
        instance.oauth_admin(request, reply, async (admin) => {
            if (!admin) {
                return reply.error('Access denied');
            }

            done();
        });
    };

    class ReleaseUtils {

        static saveFile(file, uploadDir = './static/') {
            const fileName = file.name;
            const fullPath = path.join(uploadDir, fileName);

            const stream = fs.createWriteStream(fullPath);
            stream.write(file.data);
            stream.end();

            return {
                fileName,
                fullPath,
            };
        }

        static async getRelease(id) {
            const release = await instance.Release.findById(id);

            if (!release) {
                throw {
                    code: 400,
                    message: 'Release not found',
                };
            }

            return release;
        }

    }

    const AddReleaseSchema = {
        body: {
            type: 'object',
            properties: {
                // uploaded file
                file: { type: 'object' },
                version: { type: 'string' },
                build_number: { type: 'number' },
                change_log: { type: 'string' },
            },
            required: [
                'file',
                'version',
                'build_number',
                'change_log',
            ],
        },
    };

    instance.post(
        '/release/add',
        {
            ...options.version,
            preHandler: authorizeAsAdmin,
            schema: AddReleaseSchema,
        },
        async (request, reply) => {
            try {
                const { file, ...data } = request.body;

                const found = await instance.Release.findByHash(file.md5);
                if (found) {
                    throw {
                        code: 400,
                        message: 'Release already exists',
                    };
                }

                const { fileName } = ReleaseUtils.saveFile(file);

                const release = await instance.Release.create({
                    ...data, // version, build_number, change_log
                    file_name: fileName,
                    file_size: file.size,
                    md5_hash: file.md5,
                });

                reply.ok({
                    release,
                });
            } catch (error) {
                error = instance.normalizeError(error);
                reply.send(error);
            }
            return reply;
        }
    );

    instance.post(
        '/release/:id/update',
        {
            ...options.version,
            preHandler: authorizeAsAdmin,
            schema: AddReleaseSchema,
        },
        async (request, reply) => {
            try {
                const release = await ReleaseUtils.getRelease(request.params.id);
                const { file, ...data } = request.body;

                const { fileName } = ReleaseUtils.saveFile(file);

                const updatedRelease = await instance.Release.findByIdAndUpdate(
                    release._id,
                    {
                        ...data, // version, build_number, change_log
                        file_name: fileName,
                        file_size: file.size,
                        md5_hash: file.md5,
                    },
                    { returnOriginal: false }
                );

                reply.ok({
                    release: updatedRelease,
                });
            } catch (error) {
                error = instance.normalizeError(error);
                reply.send(error);
            }
            return reply;
        }
    );

    instance.post(
        '/release/:id/delete',
        {
            ...options.version,
            preHandler: authorizeAsAdmin,
        },
        async (request, reply) => {
            try {
                const release = await ReleaseUtils.getRelease(request.params.id);
                await instance.Release.findByIdAndRemove(release._id);

                reply.ok({
                    success: true,
                });
            } catch (error) {
                error = instance.normalizeError(error);
                reply.send(error);
            }
            return reply;
        }
    );

    instance.get(
        '/release/:id',
        {
            ...options.version,
            preHandler: authorizeAsAdmin,
        },
        async (request, reply) => {
            try {
                const release = await ReleaseUtils.getRelease(request.params.id);
                reply.ok({
                    release,
                });
            } catch (error) {
                error = instance.normalizeError(error);
                reply.send(error);
            }
            return reply;
        }
    );

    instance.get(
        '/release',
        {
            ...options.version,
            preHandler: authorizeAsAdmin,
        },
        async (request, reply) => {
            try {
                const releases = await instance.Release.find({}).sort({ build_number: -1, version: -1 }).exec();
                reply.ok({
                    releases,
                });
            } catch (error) {
                error = instance.normalizeError(error);
                reply.send(error);
            }
            return reply;
        }
    );

    instance.get(
        '/release/newest',
        {
            ...options.version,
            // preHandler: authorizeAsAdmin,
        },
        async (request, reply) => {
            try {
                const releases = await instance.Release.find({})
                    .sort({
                        build_number: -1,
                        version: -1
                    })
                    .limit(1)
                    .exec();
                reply.ok({
                    release: releases[0],
                });
            } catch (error) {
                error = instance.normalizeError(error);
                reply.send(error);
            }
            return reply;
        }
    );

    next();

};
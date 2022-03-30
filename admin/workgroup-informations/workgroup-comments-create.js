const workgroupCommentsCreate = async function (request, reply, instance) {
  try {
    let { workgroup_comments } = request.body;
    const w_comments = []
    const commentsMap={}
    for(const w_c of workgroup_comments) {
      if(!commentsMap[w_c.text]) {
        w_comments.push(w_c);
      }
      commentsMap[w_c.text] = true;
    }
    workgroup_comments = w_comments;
    console.log(workgroup_comments)
    const user = request.user;
    const org = await instance.organizations.findById(user.organization);
    if (!org) {
      return reply.fourorfour("Organization");
    }
    await instance.organizations.updateOne(
      { _id: org._id },
      {
        $set: {
          workgroup_comments: workgroup_comments,
        },
      }
    );
    reply.ok({ id: org._id });
  } catch (error) {
    reply.error(error.message);
  }
};

module.exports = (instance, _, next) => {
  const commentsCreate = {
    body: {
      type: "object",
      required: ["workgroup_comments"],
      properties: {
        workgroup_comments: {
          type: "array",
          items: {
            type: "object",
            required: [
              'text', 'workgroups'
            ],
            properties: {
              text: { type: 'string' },
              workgroups: {
                type: 'array',
                items: {
                  type: 'string',
                  minLength: 24,
                  maxLength: 24
                }
              }
            }
          },
        },
      },
    },
  };

  instance.post(
    "/workgroup/comments/create",
    {
      version: "1.0.0",
      preValidation: instance.authorize_admin,
      schema: commentsCreate,
      attachValidation: true,
    },
    async (request, reply) => {
      if (request.validationError) {
        return reply.validation(request.validationError.message);
      }
      workgroupCommentsCreate(request, reply, instance);
      return reply;
    }
  );

  next();
};

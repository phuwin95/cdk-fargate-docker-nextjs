import { CodePipeline, CodePipelineSource, ShellStep } from 'aws-cdk-lib/pipelines';
import { IgnoreMode, Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';


import { Vpc } from "aws-cdk-lib/aws-ec2";
import { Cluster }from "aws-cdk-lib/aws-ecs";
import { ApplicationLoadBalancedFargateService } from "aws-cdk-lib/aws-ecs-patterns";
import { DockerImageAsset } from 'aws-cdk-lib/aws-ecr-assets';
import { ContainerImage } from 'aws-cdk-lib/aws-ecs';

export class CdkStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const pipeline = new CodePipeline(this, 'Pipeline', {
      pipelineName: 'MyPipeline',
      synth: new ShellStep('Synth', {
        input: CodePipelineSource.gitHub('phuwin95/cdk-fargate-docker-nextjs', 'main'),
        commands: ['cd cdk', 'npm ci', 'npm run build', 'npx cdk synth', 'mv cdk.out ../'],
      }),
      dockerEnabledForSelfMutation: true,
    });

    const vpc = new Vpc(this, "MyVpc", {
      maxAzs: 3 // Default is all AZs in region
    });

    const cluster = new Cluster(this, "MyCluster", {
      vpc: vpc
    });

    const asset = new DockerImageAsset(this, 'DockerImage', {
      directory: '../',
      exclude: ['cdk', 'cdk.out'],
      ignoreMode: IgnoreMode.DOCKER,
    });

    const image =  ContainerImage.fromDockerImageAsset(asset);

    const fargateService = new ApplicationLoadBalancedFargateService(this, 'FargateService', {
      cluster,
      cpu: 256,
      memoryLimitMiB: 512,
      taskImageOptions: {
        image,
      },
      publicLoadBalancer: true,
      minHealthyPercent: 100,
      maxHealthyPercent: 200,
    });

  }
}

import { CodePipeline, CodePipelineSource, ShellStep } from 'aws-cdk-lib/pipelines';
import { Stack, StackProps } from 'aws-cdk-lib';
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
        commands: ['cd cdk', 'npm ci', 'npm run build', 'npx cdk synth'],
        primaryOutputDirectory: 'cdk/cdk.out',
      })
    });

    const vpc = new Vpc(this, "MyVpc", {
      maxAzs: 3 // Default is all AZs in region
    });

    const cluster = new Cluster(this, "MyCluster", {
      vpc: vpc
    });

    // create an image from ../Dockerfile
    const image = new DockerImageAsset(this, 'DockerImage', {
      directory: '../',
    });

    // Create a load-balanced Fargate service and make it public
    new ApplicationLoadBalancedFargateService(this, "MyFargateService", {
      cluster: cluster, // Required
      cpu: 512, // Default is 256
      desiredCount: 6, // Default is 1
      taskImageOptions: { image: ContainerImage.fromDockerImageAsset(image) },
      memoryLimitMiB: 2048, // Default is 512
      publicLoadBalancer: true // Default is false
    });
  }
}

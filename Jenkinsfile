pipeline {
  agent {
    label 'slave'
  }
  stages {
    stage('Install Dependencies') {
      steps {
        nodejs('HotelHopper') {
          sh '''
                npm install
                mkdir ./migrations
                node_modules/.bin/sequelize db:migrate --url 'postgresql://localhost:5432/hotel_hopper'
                npm run test-jenkins
            '''
        }

      }
    }
    stage('Run Tests') {
      steps {
        archiveArtifacts(artifacts: 'test-result/result.xml', allowEmptyArchive: true)
        junit 'test-result/result.xml'
      }
    }
  }
  environment {
    HOME = '.'
    PSQL_URI = 'postgresql://localhost:5432/hotel_hopper'
  }
}